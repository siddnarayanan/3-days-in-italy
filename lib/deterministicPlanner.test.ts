import { buildDeterministicItinerary } from "./deterministicPlanner";
import type { Place, Preferences } from "./types";

function makePlace(overrides: Partial<Place> & Pick<Place, "id" | "city">): Place {
  return {
    name: overrides.id,
    type: "historic_site",
    region: null,
    neighborhood: null,
    description: "",
    tags: [],
    rating: 4,
    priceRange: "€€",
    durationMinutes: 60,
    hoursRaw: null,
    hoursParsed: null,
    seasonalNotes: null,
    bookingRequired: false,
    lat: null,
    lng: null,
    ...overrides,
  };
}

const BASE_PREFS: Preferences = {
  homeBase: "Florence",
  travelRadiusKm: 0,
  pace: "moderate",
  interests: [],
  budget: "any",
  notes: "",
  startDate: null,
};

// A generously sized, varied pool so slot-filling never has to fall back to
// last-resort behavior — isolates the tests below from that edge case.
function buildPool(): Place[] {
  const activityTypes = ["historic_site", "museum", "market", "viewpoint", "park", "experience"];
  const pool: Place[] = [];
  activityTypes.forEach((type, ti) => {
    for (let i = 0; i < 3; i++) {
      pool.push(
        makePlace({
          id: `act-${type}-${i}`,
          city: "Florence",
          type,
          rating: 3.5 + (i % 3) * 0.3,
          lat: 43.75 + ti * 0.005,
          lng: 11.25 + i * 0.005,
        })
      );
    }
  });
  for (let i = 0; i < 8; i++) {
    pool.push(
      makePlace({ id: `restaurant-${i}`, city: "Florence", type: "restaurant", rating: 4, lat: 43.75, lng: 11.25 })
    );
  }
  return pool;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

describe("buildDeterministicItinerary", () => {
  it("generates 3 days with no place reused across the whole trip", () => {
    const result = buildDeterministicItinerary(buildPool(), { ...BASE_PREFS, pace: "packed" });
    expect(result.days).toHaveLength(3);
    const allIds = result.days.flatMap((d) => d.stops.map((s) => s.placeId));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("respects the pace's stop-count ceiling", () => {
    const ceilings: Record<Preferences["pace"], number> = { relaxed: 3, moderate: 4, packed: 6 };
    for (const pace of Object.keys(ceilings) as Preferences["pace"][]) {
      const result = buildDeterministicItinerary(buildPool(), { ...BASE_PREFS, pace });
      for (const day of result.days) {
        expect(day.stops.length).toBeLessThanOrEqual(ceilings[pace]);
      }
    }
  });

  it("gives every stop a valid 24h HH:MM startTime", () => {
    const result = buildDeterministicItinerary(buildPool(), { ...BASE_PREFS, pace: "packed" });
    for (const day of result.days) {
      for (const stop of day.stops) {
        expect(stop.startTime).toMatch(TIME_RE);
      }
    }
  });

  it("fills the lunch/dinner slots with restaurant-type places when available", () => {
    const result = buildDeterministicItinerary(buildPool(), BASE_PREFS);
    for (const day of result.days) {
      const lunch = day.stops.find((s) => s.startTime === "13:00");
      const dinner = day.stops.find((s) => s.startTime === "19:30");
      expect(lunch?.placeId).toMatch(/^restaurant-/);
      expect(dinner?.placeId).toMatch(/^restaurant-/);
    }
  });

  it("picks up interests mentioned in free-text notes via keyword matching", () => {
    const pool = buildPool();
    pool.push(makePlace({ id: "wine-bar", city: "Florence", type: "experience", tags: ["wine"], rating: 5 }));
    const result = buildDeterministicItinerary(pool, { ...BASE_PREFS, notes: "I would love some wine tasting" });
    expect(result.overallNotes).toMatch(/wine/);
  });

  it("degrades gracefully with a scarce pool instead of throwing or duplicating", () => {
    const scarce = [
      makePlace({ id: "s1", city: "Florence", type: "historic_site" }),
      makePlace({ id: "s2", city: "Florence", type: "restaurant" }),
      makePlace({ id: "s3", city: "Florence", type: "historic_site" }),
      makePlace({ id: "s4", city: "Florence", type: "restaurant" }),
      makePlace({ id: "s5", city: "Florence", type: "historic_site" }),
      makePlace({ id: "s6", city: "Florence", type: "restaurant" }),
    ];
    expect(() => buildDeterministicItinerary(scarce, { ...BASE_PREFS, pace: "packed" })).not.toThrow();
    const result = buildDeterministicItinerary(scarce, { ...BASE_PREFS, pace: "packed" });
    const allIds = result.days.flatMap((d) => d.stops.map((s) => s.placeId));
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
