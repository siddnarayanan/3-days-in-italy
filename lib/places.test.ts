import { getPlaces } from "./places";

describe("getPlaces (against the real data/italy.json)", () => {
  const places = getPlaces();

  it("loads a substantial, non-empty dataset", () => {
    expect(places.length).toBeGreaterThan(50);
  });

  it("gives every place a unique id", () => {
    const ids = places.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every place a name, type, and city", () => {
    for (const p of places) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.type.length).toBeGreaterThan(0);
      expect(p.city.length).toBeGreaterThan(0);
    }
  });

  it("normalizes tag underscores to dashes (e.g. local_favorite -> local-favorite)", () => {
    const allTags = places.flatMap((p) => p.tags);
    expect(allTags.some((t) => t.includes("_"))).toBe(false);
    expect(allTags).toContain("local-favorite");
  });

  it("dedupes tags per place after normalization", () => {
    for (const p of places) {
      expect(new Set(p.tags).size).toBe(p.tags.length);
    }
  });

  it("parses hoursParsed whenever hoursRaw is a recognizable format", () => {
    // Not every raw string is parseable (e.g. "Evenings") — but most should be,
    // and hoursParsed should never be set when hoursRaw is null.
    let parsedCount = 0;
    for (const p of places) {
      if (p.hoursRaw == null) {
        expect(p.hoursParsed).toBeNull();
      } else if (p.hoursParsed != null) {
        parsedCount++;
      }
    }
    expect(parsedCount).toBeGreaterThan(0);
  });

  it("caches the result across calls (same array reference)", () => {
    expect(getPlaces()).toBe(places);
  });
});
