// NOT used by the live app — see lib/deterministicPlanner.ts, which is what
// app/api/plan/route.ts actually calls. This was the first approach (an LLM
// picks and sequences the itinerary via a forced tool call); kept in the repo
// as-is for reference. Switched to a rule-based planner so the deployed demo
// has no external API dependency — no cost/rate-limit/latency risk when a
// reviewer opens it. See the writeup for this app.

import Anthropic from "@anthropic-ai/sdk";
import type { Place, Preferences } from "./types";
import { ITINERARY_TOOL, RawItinerarySchema, type RawItinerary } from "./itinerarySchema";

const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Sent to the model without lat/lng — city/neighborhood already convey location,
// and keeping coordinates out of the prompt saves tokens; our own validation
// pass (lib/validate.ts) does the actual geographic distance checking.
function placeForPrompt(p: Place) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    city: p.city,
    region: p.region,
    neighborhood: p.neighborhood,
    tags: p.tags,
    rating: p.rating,
    priceRange: p.priceRange,
    durationMinutes: p.durationMinutes,
    hours: p.hoursRaw,
    seasonalNotes: p.seasonalNotes,
    bookingRequired: p.bookingRequired,
    description: p.description,
  };
}

const SYSTEM_PROMPT = `You are a meticulous Italy trip planner. You build a 3-day itinerary using ONLY the places provided in the user message's place list — never invent places, and never use a placeId that isn't in that list.

The place list has already been filtered to the traveler's chosen home base and travel radius, so every place given to you is a valid geographic choice — you do not need to enforce geographic coherence yourself, just sequence stops sensibly within each day.

Rules:
- Respect pace: relaxed = 2-3 stops/day with breathing room, moderate = 3-4, packed = 4-6.
- Order stops within a day chronologically and realistically (morning -> lunch -> afternoon -> evening), leaving sensible gaps for travel and meals given each stop's typical visit duration.
- If a day includes a stop outside the home base city, account for realistic round-trip travel time to and from it that day.
- Treat "hours" as approximate and "seasonalNotes" as authoritative when the two conflict (e.g. a seasonal closure overrides the listed hours).
- Don't reuse the same place across multiple days.
- Weight the traveler's interest tags and free-text notes heavily in which places you choose, and say why in each stop's note.
- Every stop's "note" should be one sentence explaining why that place, at that time, fits this traveler.`;

function buildUserMessage(preferences: Preferences, places: Place[]): string {
  const parts = [
    `Traveler preferences:`,
    `- Home base: ${preferences.homeBase}`,
    preferences.travelRadiusKm > 0
      ? `- Open to day trips up to ~${preferences.travelRadiusKm}km from home base`
      : `- Staying in ${preferences.homeBase} only, no day trips`,
    `- Pace: ${preferences.pace}`,
    `- Interests/tags: ${preferences.interests.length ? preferences.interests.join(", ") : "no strong preference"}`,
    `- Budget: ${preferences.budget}`,
    preferences.notes ? `- Notes: ${preferences.notes}` : null,
    ``,
    `Available places, already filtered to this traveler's home base and travel radius (JSON array, ${places.length} total):`,
    JSON.stringify(places.map(placeForPrompt)),
  ].filter((line): line is string => line !== null);
  return parts.join("\n");
}

async function generateItineraryOnce(preferences: Preferences, places: Place[]): Promise<RawItinerary> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [ITINERARY_TOOL],
    tool_choice: { type: "tool", name: ITINERARY_TOOL.name },
    messages: [{ role: "user", content: buildUserMessage(preferences, places) }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a tool call");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Model response was truncated (hit max_tokens)");
  }

  const parsed = RawItinerarySchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Model returned malformed itinerary shape: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function generateItinerary(preferences: Preferences, places: Place[]): Promise<RawItinerary> {
  try {
    return await generateItineraryOnce(preferences, places);
  } catch (err) {
    console.warn("Itinerary generation attempt failed, retrying once:", err);
    return await generateItineraryOnce(preferences, places);
  }
}
