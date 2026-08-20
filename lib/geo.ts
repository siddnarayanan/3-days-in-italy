/** Great-circle distance in kilometers. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const ROAD_DETOUR_FACTOR = 1.3; // real roads are never a straight line
const WALK_SPEED_KMH = 5;
const URBAN_SPEED_KMH = 22; // city driving/taxi, accounting for traffic and parking
const HIGHWAY_SPEED_KMH = 75; // regional/intercity, accounting for some local roads at each end

/**
 * Estimates travel time in minutes from straight-line distance — no routing
 * API involved, consistent with the rest of the app having zero external
 * dependencies. Deliberately tiered by distance rather than one flat speed:
 * a short hop is walked, a same-city trip crawls in traffic, a day-trip
 * distance mostly happens on faster roads. This matters for the itinerary's
 * proximity scoring — a 50km highway hop and a 15km urban crawl cover very
 * different distances but can take similar real time, which raw km can't see.
 */
export function estimateTravelMinutes(distanceKm: number): number {
  const roadKm = distanceKm * ROAD_DETOUR_FACTOR;
  const minutes = (roadKm / speedForRoadKm(roadKm)) * 60;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

function speedForRoadKm(roadKm: number): number {
  return roadKm <= 1.5 ? WALK_SPEED_KMH : roadKm <= 15 ? URBAN_SPEED_KMH : HIGHWAY_SPEED_KMH;
}

/** Which mode estimateTravelMinutes effectively assumed, for UI display (e.g. a walk vs. drive icon). */
export function estimateTravelMode(distanceKm: number): "walk" | "drive" {
  return distanceKm * ROAD_DETOUR_FACTOR <= 1.5 ? "walk" : "drive";
}
