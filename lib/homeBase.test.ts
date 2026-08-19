import {
  getCityCentroid,
  getHubCities,
  groupCitiesByRegion,
  filterPlacesByRadius,
  reachableCitiesAt,
  pickRandomHomeBase,
} from "./homeBase";
import type { Place } from "./types";

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

// Real coordinates (Florence, Siena, Rome) so distance-based tests reflect reality.
const FLORENCE = { lat: 43.75902, lng: 11.2587 };
const SIENA = { lat: 43.3186, lng: 11.3307 };
const ROME = { lat: 41.89402, lng: 12.47837 };

const fixturePlaces: Place[] = [
  makePlace({ id: "f1", city: "Florence", region: "Tuscany", lat: FLORENCE.lat, lng: FLORENCE.lng, tags: ["art"] }),
  makePlace({ id: "f2", city: "Florence", region: "Tuscany", lat: FLORENCE.lat + 0.01, lng: FLORENCE.lng, tags: ["food"] }),
  makePlace({ id: "s1", city: "Siena", region: "Tuscany", lat: SIENA.lat, lng: SIENA.lng, tags: ["historic"] }),
  makePlace({ id: "r1", city: "Rome", region: "Lazio", lat: ROME.lat, lng: ROME.lng, tags: ["iconic"] }),
];

describe("getCityCentroid", () => {
  it("averages coordinates for places in that city", () => {
    const centroid = getCityCentroid(fixturePlaces, "Florence");
    expect(centroid).not.toBeNull();
    expect(centroid!.lat).toBeCloseTo((FLORENCE.lat + (FLORENCE.lat + 0.01)) / 2, 5);
  });

  it("returns null for a city with no places", () => {
    expect(getCityCentroid(fixturePlaces, "Nowhere")).toBeNull();
  });
});

describe("groupCitiesByRegion", () => {
  it("groups and dedupes cities per region", () => {
    const grouped = groupCitiesByRegion(fixturePlaces);
    const tuscany = grouped.find((g) => g.region === "Tuscany");
    expect(tuscany?.cities.sort()).toEqual(["Florence", "Siena"]);
    const lazio = grouped.find((g) => g.region === "Lazio");
    expect(lazio?.cities).toEqual(["Rome"]);
  });
});

describe("getHubCities", () => {
  it("only includes cities with enough places to anchor a trip", () => {
    // None of the fixture cities hit the real 15-place threshold.
    expect(getHubCities(fixturePlaces)).toEqual([]);
  });

  it("includes a city once it crosses the threshold", () => {
    const many = Array.from({ length: 16 }, (_, i) =>
      makePlace({ id: `many-${i}`, city: "Milan", lat: 45.46, lng: 9.19 })
    );
    expect(getHubCities([...fixturePlaces, ...many])).toEqual(["Milan"]);
  });
});

describe("pickRandomHomeBase", () => {
  it("picks a real city from the given places", () => {
    const cities = new Set(fixturePlaces.map((p) => p.city));
    for (let i = 0; i < 20; i++) {
      expect(cities.has(pickRandomHomeBase(fixturePlaces))).toBe(true);
    }
  });
});

describe("filterPlacesByRadius", () => {
  it("with radius 0, returns only the home base city", () => {
    const filtered = filterPlacesByRadius(fixturePlaces, "Florence", 0);
    expect(filtered.map((p) => p.id).sort()).toEqual(["f1", "f2"]);
  });

  it("with a radius covering the real Florence-Siena distance (~49km), includes Siena", () => {
    const filtered = filterPlacesByRadius(fixturePlaces, "Florence", 60);
    expect(filtered.map((p) => p.id).sort()).toEqual(["f1", "f2", "s1"]);
  });

  it("excludes places outside the radius (Rome is ~230km from Florence)", () => {
    const filtered = filterPlacesByRadius(fixturePlaces, "Florence", 60);
    expect(filtered.some((p) => p.id === "r1")).toBe(false);
  });

  it("always includes the home base city even without coordinates", () => {
    const noCoords = [makePlace({ id: "x1", city: "Ghosttown" })];
    expect(filterPlacesByRadius(noCoords, "Ghosttown", 50).map((p) => p.id)).toEqual(["x1"]);
  });
});

describe("reachableCitiesAt", () => {
  it("lists other cities within the given radius, excluding the home base itself", () => {
    expect(reachableCitiesAt(fixturePlaces, "Florence", 60)).toEqual(["Siena"]);
    expect(reachableCitiesAt(fixturePlaces, "Florence", 10)).toEqual([]);
  });
});
