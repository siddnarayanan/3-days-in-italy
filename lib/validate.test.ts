import { buildItinerary, collectAllWarnings } from "./validate";
import { parseHours } from "./hours";
import type { Place, Preferences } from "./types";
import type { RawItinerary } from "./itinerarySchema";

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

// Real coordinates so distance-based warnings reflect reality.
const FLORENCE = { lat: 43.75902, lng: 11.2587 };
const ROME = { lat: 41.89402, lng: 12.47837 };

describe("buildItinerary", () => {
  it("joins stops to their places and carries theme/summary/overallNotes through", () => {
    const places = new Map([["p1", makePlace({ id: "p1", city: "Florence", name: "Duomo" })]]);
    const raw: RawItinerary = {
      days: [{ day: 1, theme: "Test Day", summary: "Test summary", stops: [{ placeId: "p1", startTime: "10:00", note: "note" }] }],
      overallNotes: "trip notes",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.overallNotes).toBe("trip notes");
    expect(result.days[0].theme).toBe("Test Day");
    expect(result.days[0].stops[0].place?.name).toBe("Duomo");
    expect(collectAllWarnings(result, [])).toEqual([]);
  });

  it("drops an unknown placeId and surfaces a top-level warning instead of throwing", () => {
    const places = new Map<string, Place>();
    const raw: RawItinerary = {
      days: [{ day: 1, theme: "T", summary: "S", stops: [{ placeId: "ghost", startTime: "10:00", note: "n" }] }],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].stops).toHaveLength(0);
    expect(collectAllWarnings(result, [])).toEqual(
      expect.arrayContaining([expect.stringContaining("unknown place")])
    );
  });

  it("flags a place reused across days", () => {
    const places = new Map([["p1", makePlace({ id: "p1", city: "Florence" })]]);
    const raw: RawItinerary = {
      days: [
        { day: 1, theme: "T1", summary: "S", stops: [{ placeId: "p1", startTime: "10:00", note: "n" }] },
        { day: 2, theme: "T2", summary: "S", stops: [{ placeId: "p1", startTime: "10:00", note: "n" }] },
      ],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].stops[0].warnings).toEqual([]);
    expect(result.days[1].stops[0].warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("also appears elsewhere")])
    );
  });

  it("flags an hours conflict when a trip start date is given", () => {
    const restaurant = makePlace({
      id: "p1",
      city: "Florence",
      type: "restaurant",
      hoursRaw: "12:30-14:30",
      hoursParsed: parseHours("12:30-14:30"),
    });
    const places = new Map([["p1", restaurant]]);
    const raw: RawItinerary = {
      days: [{ day: 1, theme: "T", summary: "S", stops: [{ placeId: "p1", startTime: "09:00", note: "n" }] }],
      overallNotes: "",
    };
    // 2026-08-17 is a Monday.
    const result = buildItinerary(raw, places, { ...BASE_PREFS, startDate: "2026-08-17" });
    expect(result.days[0].stops[0].warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("outside typical hours")])
    );
  });

  it("does not flag hours conflicts when no start date is given (can't know the weekday)", () => {
    const restaurant = makePlace({
      id: "p1",
      city: "Florence",
      type: "restaurant",
      hoursRaw: "12:30-14:30",
      hoursParsed: parseHours("12:30-14:30"),
    });
    const places = new Map([["p1", restaurant]]);
    const raw: RawItinerary = {
      days: [{ day: 1, theme: "T", summary: "S", stops: [{ placeId: "p1", startTime: "09:00", note: "n" }] }],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].stops[0].warnings).toEqual([]);
  });

  it("flags out-of-order stops within a day", () => {
    const places = new Map([
      ["p1", makePlace({ id: "p1", city: "Florence" })],
      ["p2", makePlace({ id: "p2", city: "Florence" })],
    ]);
    const raw: RawItinerary = {
      days: [
        {
          day: 1,
          theme: "T",
          summary: "S",
          stops: [
            { placeId: "p1", startTime: "15:00", note: "n" },
            { placeId: "p2", startTime: "10:00", note: "n" },
          ],
        },
      ],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("chronological order")])
    );
  });

  it("flags a day with no valid stops", () => {
    const places = new Map<string, Place>();
    const raw: RawItinerary = { days: [{ day: 1, theme: "T", summary: "S", stops: [] }], overallNotes: "" };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].warnings).toEqual(expect.arrayContaining([expect.stringContaining("No valid stops")]));
  });

  it("flags stops spread far apart within a single day", () => {
    const places = new Map([
      ["p1", makePlace({ id: "p1", city: "Florence", lat: FLORENCE.lat, lng: FLORENCE.lng })],
      ["p2", makePlace({ id: "p2", city: "Rome", lat: ROME.lat, lng: ROME.lng })],
    ]);
    const raw: RawItinerary = {
      days: [
        {
          day: 1,
          theme: "T",
          summary: "S",
          stops: [
            { placeId: "p1", startTime: "10:00", note: "n" },
            { placeId: "p2", startTime: "15:00", note: "n" },
          ],
        },
      ],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].warnings).toEqual(expect.arrayContaining([expect.stringContaining("spread")]));
  });

  it("flags a stop scheduled without enough time to realistically travel there (duration fits, travel doesn't)", () => {
    const places = new Map([
      ["p1", makePlace({ id: "p1", city: "Florence", lat: FLORENCE.lat, lng: FLORENCE.lng, durationMinutes: 15 })],
      ["p2", makePlace({ id: "p2", city: "Rome", lat: ROME.lat, lng: ROME.lng })],
    ]);
    const raw: RawItinerary = {
      days: [
        {
          day: 1,
          theme: "T",
          summary: "S",
          stops: [
            { placeId: "p1", startTime: "10:00", note: "n" },
            { placeId: "p2", startTime: "10:30", note: "n" }, // Rome is ~230km away — 15 min left over isn't close to enough
          ],
        },
      ],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].stops[1].warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Only ~")])
    );
  });

  it("flags a stop whose own visit duration doesn't fit before the next stop, on the earlier stop", () => {
    // The exact scenario this was built for: don't spend 5 hours somewhere
    // when the next activity is only 3.5 hours later.
    const places = new Map([
      ["p1", makePlace({ id: "p1", city: "Florence", lat: FLORENCE.lat, lng: FLORENCE.lng, durationMinutes: 300 })],
      ["p2", makePlace({ id: "p2", city: "Florence", lat: FLORENCE.lat + 0.001, lng: FLORENCE.lng })],
    ]);
    const raw: RawItinerary = {
      days: [
        {
          day: 1,
          theme: "T",
          summary: "S",
          stops: [
            { placeId: "p1", startTime: "10:00", note: "n" },
            { placeId: "p2", startTime: "13:30", note: "n" }, // 3.5 hours later, place takes 5
          ],
        },
      ],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].stops[0].warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Typically takes ~300 min")])
    );
    expect(result.days[0].stops[1].warnings).toEqual([]);
  });

  it("does not flag a travel-time gap when there's clearly enough time", () => {
    const places = new Map([
      ["p1", makePlace({ id: "p1", city: "Florence", lat: FLORENCE.lat, lng: FLORENCE.lng, durationMinutes: 60 })],
      ["p2", makePlace({ id: "p2", city: "Florence", lat: FLORENCE.lat + 0.001, lng: FLORENCE.lng })],
    ]);
    const raw: RawItinerary = {
      days: [
        {
          day: 1,
          theme: "T",
          summary: "S",
          stops: [
            { placeId: "p1", startTime: "10:00", note: "n" },
            { placeId: "p2", startTime: "12:00", note: "n" }, // two hours for a ~100m hop
          ],
        },
      ],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(result.days[0].stops[1].warnings).toEqual([]);
  });

  it("flags a trip that spans a wide geographic area across days", () => {
    const places = new Map([
      ["p1", makePlace({ id: "p1", city: "Florence", lat: FLORENCE.lat, lng: FLORENCE.lng })],
      ["p2", makePlace({ id: "p2", city: "Rome", lat: ROME.lat, lng: ROME.lng })],
    ]);
    const raw: RawItinerary = {
      days: [
        { day: 1, theme: "T1", summary: "S", stops: [{ placeId: "p1", startTime: "10:00", note: "n" }] },
        { day: 2, theme: "T2", summary: "S", stops: [{ placeId: "p2", startTime: "10:00", note: "n" }] },
      ],
      overallNotes: "",
    };
    const result = buildItinerary(raw, places, BASE_PREFS);
    expect(collectAllWarnings(result, [])).toEqual(
      expect.arrayContaining([expect.stringContaining("spans ~")])
    );
  });
});
