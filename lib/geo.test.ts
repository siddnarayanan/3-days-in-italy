import { haversineKm } from "./geo";

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(41.9028, 12.4964, 41.9028, 12.4964)).toBeCloseTo(0, 5);
  });

  it("is symmetric", () => {
    const a = haversineKm(41.8902, 12.4922, 43.7696, 11.2558);
    const b = haversineKm(43.7696, 11.2558, 41.8902, 12.4922);
    expect(a).toBeCloseTo(b, 6);
  });

  it("matches the real Florence <-> Siena distance used to calibrate the travel-radius tiers (~49km)", () => {
    // Centroids computed from the actual dataset (see lib/homeBase.ts comments).
    const florence = { lat: 43.75902, lng: 11.2587 };
    const siena = { lat: 43.3186, lng: 11.3307 };
    const km = haversineKm(florence.lat, florence.lng, siena.lat, siena.lng);
    expect(km).toBeGreaterThan(40);
    expect(km).toBeLessThan(58);
  });

  it("matches the real Rome <-> Florence distance (~230km)", () => {
    const rome = { lat: 41.89402333333333, lng: 12.478366666666666 };
    const florence = { lat: 43.75902, lng: 11.2587 };
    const km = haversineKm(rome.lat, rome.lng, florence.lat, florence.lng);
    expect(km).toBeGreaterThan(210);
    expect(km).toBeLessThan(250);
  });
});
