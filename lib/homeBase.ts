import { haversineKm } from "./geo";
import type { Place } from "./types";

export const TRAVEL_RADIUS_TIERS = [
  { km: 60, label: "Nearby day trips", hint: "~1hr away" },
  { km: 130, label: "Regional", hint: "~2hr away" },
  { km: 220, label: "Willing to go further", hint: "~3hr+ away" },
] as const;

// Home base candidates for "anywhere" need enough places to actually fill a
// 3-day itinerary without repeats; below this a city is too thin to anchor a
// trip on its own.
const MIN_PLACES_FOR_HUB = 15;

export function getCityCentroid(places: Place[], city: string): { lat: number; lng: number } | null {
  const withCoords = places.filter((p) => p.city === city && p.lat != null && p.lng != null);
  if (withCoords.length === 0) return null;
  const lat = withCoords.reduce((sum, p) => sum + p.lat!, 0) / withCoords.length;
  const lng = withCoords.reduce((sum, p) => sum + p.lng!, 0) / withCoords.length;
  return { lat, lng };
}

export function groupCitiesByRegion(places: Place[]): { region: string; cities: string[] }[] {
  const map = new Map<string, Set<string>>();
  for (const p of places) {
    const region = p.region ?? "Other";
    if (!map.has(region)) map.set(region, new Set());
    if (p.city) map.get(region)!.add(p.city);
  }
  return Array.from(map.entries())
    .map(([region, cities]) => ({ region, cities: Array.from(cities).sort() }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

export function getHubCities(places: Place[]): string[] {
  const counts = new Map<string, number>();
  for (const p of places) counts.set(p.city, (counts.get(p.city) ?? 0) + 1);
  return Array.from(counts.entries())
    .filter(([, count]) => count >= MIN_PLACES_FOR_HUB)
    .map(([city]) => city);
}

/** Picks a random well-stocked city to anchor a trip when the traveler has no preference. */
export function pickRandomHomeBase(places: Place[]): string {
  const hubs = getHubCities(places);
  const pool = hubs.length > 0 ? hubs : Array.from(new Set(places.map((p) => p.city)));
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface CitySummary {
  city: string;
  region: string | null;
  count: number;
  topTags: string[];
}

export function getCitySummary(places: Place[], city: string): CitySummary {
  const inCity = places.filter((p) => p.city === city);
  const tagCounts = new Map<string, number>();
  for (const p of inCity) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
  return {
    city,
    region: inCity[0]?.region ?? null,
    count: inCity.length,
    topTags,
  };
}

/** Places within radiusKm of homeBase's centroid. radiusKm=0 means "homeBase city only". */
export function filterPlacesByRadius(places: Place[], homeBase: string, radiusKm: number): Place[] {
  if (radiusKm <= 0) return places.filter((p) => p.city === homeBase);
  const center = getCityCentroid(places, homeBase);
  if (!center) return places.filter((p) => p.city === homeBase);
  return places.filter((p) => {
    if (p.city === homeBase) return true;
    if (p.lat == null || p.lng == null) return false;
    return haversineKm(center.lat, center.lng, p.lat, p.lng) <= radiusKm;
  });
}

/** Which other cities become reachable at a given radius tier — used to make the travel-radius picker concrete. */
export function reachableCitiesAt(places: Place[], homeBase: string, radiusKm: number): string[] {
  const center = getCityCentroid(places, homeBase);
  if (!center) return [];
  const cities = new Set<string>();
  for (const p of places) {
    if (p.city === homeBase || p.lat == null || p.lng == null) continue;
    if (haversineKm(center.lat, center.lng, p.lat, p.lng) <= radiusKm) cities.add(p.city);
  }
  return Array.from(cities).sort();
}
