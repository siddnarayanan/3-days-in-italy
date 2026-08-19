import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlaces } from "@/lib/places";
import { filterPlacesByRadius } from "@/lib/homeBase";
import { buildDeterministicItinerary } from "@/lib/deterministicPlanner";
import { buildItinerary, collectAllWarnings } from "@/lib/validate";
import type { PlanResponse, Preferences } from "@/lib/types";

export const dynamic = "force-dynamic";

const MIN_CANDIDATE_PLACES = 6;

const PreferencesSchema = z.object({
  homeBase: z.string().min(1).max(200),
  travelRadiusKm: z.number().min(0).max(1000),
  pace: z.enum(["relaxed", "moderate", "packed"]),
  interests: z.array(z.string()).max(20),
  budget: z.enum(["any", "budget", "mid", "splurge"]),
  notes: z.string().max(1000),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences", details: parsed.error.flatten() }, { status: 400 });
  }
  const preferences: Preferences = parsed.data;

  const places = getPlaces();
  const placesById = new Map(places.map((p) => [p.id, p]));

  const candidatePlaces = filterPlacesByRadius(places, preferences.homeBase, preferences.travelRadiusKm);
  if (candidatePlaces.length < MIN_CANDIDATE_PLACES) {
    return NextResponse.json(
      {
        error: `Only ${candidatePlaces.length} places are available for ${preferences.homeBase} within ${preferences.travelRadiusKm}km — try allowing more travel or picking a different home base.`,
      },
      { status: 400 }
    );
  }

  try {
    const raw = buildDeterministicItinerary(candidatePlaces, preferences);
    const itinerary = buildItinerary(raw, placesById, preferences);
    const warnings = collectAllWarnings(itinerary, []);
    // Generation respects the traveler's chosen radius, but manual add/remove
    // (lib/deterministicPlanner.ts's output is just a starting point) shouldn't
    // be — the full dataset goes to the client so "Add a stop" can reach any
    // place, not just the ones the auto-generated plan was scoped to.
    const response: PlanResponse = { itinerary, warnings, availablePlaces: places };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Itinerary generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate itinerary: ${message}` }, { status: 500 });
  }
}
