import { checkHoursConflict, dayKeyForDate, timeToMinutes } from "./hours";
import { haversineKm, estimateTravelMinutes } from "./geo";
import type { RawItinerary } from "./itinerarySchema";
import type { Itinerary, ItineraryDay, ItineraryStop, Place, Preferences } from "./types";

const DAY_SPREAD_WARNING_KM = 60;
const TRIP_SPREAD_WARNING_KM = 150;

/**
 * Joins the model's raw tool-call output against real place data and runs
 * deterministic sanity checks. The LLM picks the itinerary; this is the
 * guardrail layer that surfaces (never silently hides) likely problems —
 * unknown ids, hour conflicts, repeated stops, or a plan that's geographically
 * incoherent for a single 3-day trip.
 */
export function buildItinerary(raw: RawItinerary, placesById: Map<string, Place>, preferences: Preferences): Itinerary {
  const topWarnings: string[] = [];
  const seenPlaceIds = new Set<string>();

  const days: ItineraryDay[] = raw.days.map((rawDay) => {
    const dayWarnings: string[] = [];
    const dayOffset = rawDay.day - 1;
    const dayKey = preferences.startDate ? dayKeyForDate(preferences.startDate, dayOffset) : null;

    const stops: ItineraryStop[] = [];
    let prevStop: ItineraryStop | null = null;
    for (const rawStop of rawDay.stops) {
      const place = placesById.get(rawStop.placeId);
      if (!place) {
        topWarnings.push(`Day ${rawDay.day}: itinerary referenced an unknown place and it was dropped.`);
        continue;
      }

      const stopWarnings: string[] = [];
      if (seenPlaceIds.has(place.id)) {
        stopWarnings.push("This place also appears elsewhere in the itinerary.");
      }
      seenPlaceIds.add(place.id);

      const hoursWarning = checkHoursConflict(place.hoursParsed, dayKey, rawStop.startTime);
      if (hoursWarning) stopWarnings.push(hoursWarning);

      // Does the schedule leave enough time for the previous stop's own visit,
      // and then enough time to travel here on top of that? Two distinct
      // problems: the first is about the previous stop overrunning into this
      // one regardless of distance, the second is genuinely about the trip
      // between them. Both skipped when times are already out of order —
      // that's its own warning below.
      if (prevStop && rawStop.startTime > prevStop.startTime) {
        const gapMinutes = timeToMinutes(rawStop.startTime) - timeToMinutes(prevStop.startTime);
        const prevDuration = prevStop.place?.durationMinutes ?? 60;

        if (gapMinutes < prevDuration) {
          // Attaches to the PREVIOUS stop — it's that visit's length that doesn't fit, not this one.
          prevStop.warnings.push(
            `Typically takes ~${prevDuration} min, but the schedule only allows ~${gapMinutes} min before ${place.name} at ${rawStop.startTime}.`
          );
        } else if (prevStop.place?.lat != null && prevStop.place.lng != null && place.lat != null && place.lng != null) {
          const travelKm = haversineKm(prevStop.place.lat, prevStop.place.lng, place.lat, place.lng);
          const travelMinutes = estimateTravelMinutes(travelKm);
          const remainingMinutes = gapMinutes - prevDuration;
          if (remainingMinutes < travelMinutes) {
            stopWarnings.push(
              `Only ~${remainingMinutes} min to get here from ${prevStop.place.name} — allow ~${travelMinutes} min based on distance.`
            );
          }
        }
      }

      const stop: ItineraryStop = {
        placeId: rawStop.placeId,
        startTime: rawStop.startTime,
        note: rawStop.note,
        place,
        warnings: stopWarnings,
      };
      stops.push(stop);
      prevStop = stop;
    }

    if (stops.length === 0) {
      dayWarnings.push("No valid stops were generated for this day.");
    } else {
      for (let i = 1; i < stops.length; i++) {
        if (stops[i].startTime < stops[i - 1].startTime) {
          dayWarnings.push("Stops appear out of chronological order.");
          break;
        }
      }
      const withCoords = stops.filter((s) => s.place?.lat != null && s.place?.lng != null);
      let maxKm = 0;
      for (let i = 0; i < withCoords.length; i++) {
        for (let j = i + 1; j < withCoords.length; j++) {
          const a = withCoords[i].place!;
          const b = withCoords[j].place!;
          maxKm = Math.max(maxKm, haversineKm(a.lat!, a.lng!, b.lat!, b.lng!));
        }
      }
      if (maxKm > DAY_SPREAD_WARNING_KM) {
        dayWarnings.push(
          `Stops are spread ~${Math.round(maxKm)}km apart — expect real travel time between them.`
        );
      }
    }

    return {
      day: rawDay.day,
      theme: rawDay.theme,
      summary: rawDay.summary,
      stops,
      warnings: dayWarnings,
    };
  });

  const allWithCoords = days
    .flatMap((d) => d.stops)
    .filter((s) => s.place?.lat != null && s.place?.lng != null);
  let tripMaxKm = 0;
  for (let i = 0; i < allWithCoords.length; i++) {
    for (let j = i + 1; j < allWithCoords.length; j++) {
      const a = allWithCoords[i].place!;
      const b = allWithCoords[j].place!;
      tripMaxKm = Math.max(tripMaxKm, haversineKm(a.lat!, a.lng!, b.lat!, b.lng!));
    }
  }
  if (tripMaxKm > TRIP_SPREAD_WARNING_KM) {
    topWarnings.push(
      `This itinerary spans ~${Math.round(tripMaxKm)}km — it covers multiple distant areas of Italy, so expect significant travel between days.`
    );
  }

  return {
    days,
    overallNotes: raw.overallNotes,
    warnings: topWarnings,
  };
}

export function collectAllWarnings(itinerary: Itinerary, extra: string[]): string[] {
  const fromDays = itinerary.days.flatMap((d) => d.warnings);
  const fromStops = itinerary.days.flatMap((d) => d.stops.flatMap((s) => s.warnings));
  return [...extra, ...itinerary.warnings, ...fromDays, ...fromStops];
}
