import { checkHoursConflict, dayKeyForDate } from "./hours";
import { haversineKm } from "./geo";
import type { RawItinerary } from "./itinerarySchema";
import type { DayKey, Place, Preferences } from "./types";

// Rule-based itinerary builder — no external API calls, so nothing here can
// rate-limit, cost money, or 502 when a reviewer opens the deployed app.
// Produces the same RawItinerary shape the LLM path did (lib/anthropic.ts),
// so it flows through the same validation/guardrail layer in lib/validate.ts.

interface Slot {
  time: string;
  kind: "meal" | "activity";
}

// Matches the "2-3 / 3-4 / 4-6 stops per day" language already shown in the
// pace picker; times land inside the dataset's real dining-hour patterns
// (lunch ~12:30-14:30, dinner ~19:30-22:30).
const PACE_TEMPLATES: Record<Preferences["pace"], Slot[]> = {
  relaxed: [
    { time: "10:00", kind: "activity" },
    { time: "13:00", kind: "meal" },
    { time: "19:30", kind: "meal" },
  ],
  moderate: [
    { time: "09:30", kind: "activity" },
    { time: "13:00", kind: "meal" },
    { time: "16:00", kind: "activity" },
    { time: "19:30", kind: "meal" },
  ],
  packed: [
    { time: "09:00", kind: "activity" },
    { time: "11:00", kind: "activity" },
    { time: "13:00", kind: "meal" },
    { time: "15:00", kind: "activity" },
    { time: "17:00", kind: "activity" },
    { time: "20:00", kind: "meal" },
  ],
};

const MEAL_TYPES = new Set(["restaurant", "cafe"]);

const TYPE_LABELS: Record<string, string> = {
  historic_site: "historic site",
  museum: "museum",
  restaurant: "restaurant",
  cafe: "café",
  market: "market",
  neighborhood: "neighborhood",
  viewpoint: "viewpoint",
  park: "park",
  shop: "shop",
  experience: "experience",
};

function humanizeType(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

/** Cheap keyword match against free-text notes so they still influence selection without an LLM. */
function inferInterestsFromNotes(notes: string, knownTags: Set<string>): string[] {
  const words = notes.toLowerCase().split(/[^a-z-]+/).filter(Boolean);
  return words.filter((w) => knownTags.has(w));
}

interface ScoreContext {
  prevPlace: Place | null;
  typeUsageCount: Map<string, number>;
  interests: string[];
  budget: Preferences["budget"];
}

function budgetBonus(place: Place, budget: Preferences["budget"]): number {
  if (budget === "any" || !place.priceRange) return 0;
  const target: Record<Exclude<Preferences["budget"], "any">, string[]> = {
    budget: ["€"],
    mid: ["€€", "€€€"],
    splurge: ["€€€€"],
  };
  const wanted = target[budget];
  if (wanted.includes(place.priceRange)) return 1.5;
  // one symbol off is a mild mismatch, not disqualifying
  return -0.5;
}

function scorePlace(place: Place, ctx: ScoreContext): number {
  let score = place.rating ?? 3.5;

  const matchingTags = place.tags.filter((t) => ctx.interests.includes(t));
  score += matchingTags.length * 1.5;

  score += budgetBonus(place, ctx.budget);

  const priorUses = ctx.typeUsageCount.get(place.type) ?? 0;
  score -= priorUses * 0.4;

  if (ctx.prevPlace?.lat != null && ctx.prevPlace?.lng != null && place.lat != null && place.lng != null) {
    const km = haversineKm(ctx.prevPlace.lat, ctx.prevPlace.lng, place.lat, place.lng);
    score -= km / 15;
  }

  return score;
}

/** Picks among the top few candidates (weighted toward the best) instead of always #1, so Regenerate gives varied results. */
function pickFromTop<T extends { score: number }>(scored: T[], k = 3): T {
  const top = scored.slice(0, Math.min(k, scored.length));
  return top[Math.floor(Math.random() * top.length)];
}

const NOTE_TEMPLATES_MATCH = [
  (tags: string) => `Matches your interest in ${tags}.`,
  (tags: string) => `Picked for your love of ${tags}.`,
  (tags: string) => `A strong fit given your interest in ${tags}.`,
];
const NOTE_TEMPLATES_GENERIC = [
  (p: Place) => `A well-regarded local ${humanizeType(p.type)}${p.rating ? ` (${p.rating}★)` : ""}.`,
  (p: Place) => `Worth the stop — a solid ${humanizeType(p.type)} in ${p.neighborhood ?? p.city}.`,
];

function generateNote(place: Place, interests: string[]): string {
  const matchingTags = place.tags.filter((t) => interests.includes(t));
  if (matchingTags.length > 0) {
    const template = NOTE_TEMPLATES_MATCH[Math.floor(Math.random() * NOTE_TEMPLATES_MATCH.length)];
    return template(matchingTags.slice(0, 2).join(" and "));
  }
  const template = NOTE_TEMPLATES_GENERIC[Math.floor(Math.random() * NOTE_TEMPLATES_GENERIC.length)];
  return template(place);
}

const GENERIC_TAGS = new Set(["tourist-heavy", "iconic", "seasonal"]);

function deriveTheme(dayPlaces: Place[], fallbackCity: string): string {
  const counts = new Map<string, number>();
  for (const p of dayPlaces) {
    for (const t of p.tags) {
      if (GENERIC_TAGS.has(t)) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([tag]) => tag.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  return top.length > 0 ? top.join(" & ") : `${fallbackCity} Highlights`;
}

function deriveSummary(dayPlaces: Place[], pace: Preferences["pace"]): string {
  const meals = dayPlaces.filter((p) => MEAL_TYPES.has(p.type));
  const lunch = meals[0];
  const dinner = meals[meals.length - 1];
  const activityCount = dayPlaces.length - meals.length;
  const parts = [`A ${pace} day with ${activityCount} activit${activityCount === 1 ? "y" : "ies"}`];
  if (lunch) parts.push(`lunch at ${lunch.name}`);
  if (dinner && dinner !== lunch) parts.push(`dinner at ${dinner.name}`);
  return parts.join(", ") + ".";
}

export function buildDeterministicItinerary(candidatePlaces: Place[], preferences: Preferences): RawItinerary {
  const knownTags = new Set(candidatePlaces.flatMap((p) => p.tags));
  const inferredInterests = inferInterestsFromNotes(preferences.notes, knownTags);
  const interests = Array.from(new Set([...preferences.interests, ...inferredInterests]));

  const used = new Set<string>();
  const typeUsageCount = new Map<string, number>();
  const days: RawItinerary["days"] = [];

  for (let day = 1; day <= 3; day++) {
    const dayKey: DayKey | null = preferences.startDate ? dayKeyForDate(preferences.startDate, day - 1) : null;
    const remainingDays = 3 - day + 1;
    const remainingPool = candidatePlaces.length - used.size;
    const fairShare = Math.max(1, Math.floor(remainingPool / remainingDays));
    const template = PACE_TEMPLATES[preferences.pace].slice(0, Math.min(PACE_TEMPLATES[preferences.pace].length, fairShare));

    const dayPlaces: Place[] = [];
    const stops: RawItinerary["days"][number]["stops"] = [];
    let prevPlace: Place | null = null;

    for (const slot of template) {
      const unused = candidatePlaces.filter((p) => !used.has(p.id));
      if (unused.length === 0) break;

      const byKind = unused.filter((p) => (slot.kind === "meal" ? MEAL_TYPES.has(p.type) : !MEAL_TYPES.has(p.type)));
      const byKindAndHours =
        dayKey != null
          ? byKind.filter((p) => !p.hoursParsed || checkHoursConflict(p.hoursParsed, dayKey, slot.time) === null)
          : byKind;

      const pool = byKindAndHours.length > 0 ? byKindAndHours : byKind.length > 0 ? byKind : unused;

      const scored = pool
        .map((place) => ({ place, score: scorePlace(place, { prevPlace, typeUsageCount, interests, budget: preferences.budget }) }))
        .sort((a, b) => b.score - a.score);
      const chosen = pickFromTop(scored).place;

      used.add(chosen.id);
      typeUsageCount.set(chosen.type, (typeUsageCount.get(chosen.type) ?? 0) + 1);
      stops.push({ placeId: chosen.id, startTime: slot.time, note: generateNote(chosen, interests) });
      dayPlaces.push(chosen);
      prevPlace = chosen;
    }

    if (stops.length === 0) continue;

    days.push({
      day,
      theme: deriveTheme(dayPlaces, dayPlaces[0]?.city ?? preferences.homeBase),
      summary: deriveSummary(dayPlaces, preferences.pace),
      stops,
    });
  }

  const radiusNote =
    preferences.travelRadiusKm > 0
      ? `day trips up to ~${preferences.travelRadiusKm}km from ${preferences.homeBase}`
      : `${preferences.homeBase} only`;
  const interestNote = interests.length > 0 ? `, weighted toward ${interests.join(", ")}` : "";
  const overallNotes = `This itinerary covers ${radiusNote}${interestNote}. Built with a rule-based planner: places are scored by rating, interest match, budget fit, and geographic proximity within each day — no AI model in the loop.`;

  return { days, overallNotes };
}
