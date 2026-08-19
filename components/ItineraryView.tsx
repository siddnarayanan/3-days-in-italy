"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { buildItinerary, collectAllWarnings } from "@/lib/validate";
import { addMinutesToTime } from "@/lib/hours";
import type { RawItinerary } from "@/lib/itinerarySchema";
import type { Itinerary, Place, Preferences } from "@/lib/types";
import DayTimeline from "./DayTimeline";
import AddStopModal from "./AddStopModal";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

interface Props {
  itinerary: Itinerary;
  preferences: Preferences;
  availablePlaces: Place[];
  onRegenerate: () => void;
  onStartOver: () => void;
  isRegenerating: boolean;
}

function toRawDays(itinerary: Itinerary): RawItinerary["days"] {
  return itinerary.days.map((d) => ({
    day: d.day,
    theme: d.theme,
    summary: d.summary,
    stops: d.stops.map((s) => ({ placeId: s.placeId, startTime: s.startTime, note: s.note })),
  }));
}

export default function ItineraryView({
  itinerary,
  preferences,
  availablePlaces,
  onRegenerate,
  onStartOver,
  isRegenerating,
}: Props) {
  const [activeDay, setActiveDay] = useState(1);
  const [rawDays, setRawDays] = useState<RawItinerary["days"]>(() => toRawDays(itinerary));
  const [addingToDay, setAddingToDay] = useState<number | null>(null);

  // A regenerate produces a brand-new itinerary object — resync local edits to it
  // by adjusting state during render (React's recommended pattern for this,
  // rather than an effect that would cause an extra render pass).
  const [syncedItinerary, setSyncedItinerary] = useState(itinerary);
  if (itinerary !== syncedItinerary) {
    setSyncedItinerary(itinerary);
    setRawDays(toRawDays(itinerary));
    setActiveDay(1);
  }

  const placesById = useMemo(() => new Map(availablePlaces.map((p) => [p.id, p])), [availablePlaces]);

  // Re-derive the joined + validated itinerary from local edits on every change —
  // reuses the exact same guardrail logic (lib/validate.ts) the server used, so
  // manual add/remove get fresh hours/duplicate/geo-spread checks for free, with
  // no round-trip.
  const derived = useMemo(
    () => buildItinerary({ days: rawDays, overallNotes: itinerary.overallNotes }, placesById, preferences),
    [rawDays, placesById, preferences, itinerary.overallNotes]
  );
  const warnings = useMemo(() => collectAllWarnings(derived, []), [derived]);

  const day = derived.days.find((d) => d.day === activeDay) ?? derived.days[0];

  const usedPlaceIds = useMemo(() => new Set(rawDays.flatMap((d) => d.stops.map((s) => s.placeId))), [rawDays]);
  const unusedCandidates = useMemo(
    () => availablePlaces.filter((p) => !usedPlaceIds.has(p.id)),
    [availablePlaces, usedPlaceIds]
  );

  const points = useMemo(
    () =>
      day.stops
        .filter((s) => s.place?.lat != null && s.place?.lng != null)
        .map((s, i) => ({ lat: s.place!.lat!, lng: s.place!.lng!, label: s.place!.name, order: i + 1 })),
    [day]
  );

  function handleRemoveStop(dayNumber: number, placeId: string) {
    setRawDays((prev) =>
      prev.map((d) => (d.day === dayNumber ? { ...d, stops: d.stops.filter((s) => s.placeId !== placeId) } : d))
    );
  }

  function handleReorderStops(dayNumber: number, oldIndex: number, newIndex: number) {
    setRawDays((prev) =>
      prev.map((d) => {
        if (d.day !== dayNumber) return d;
        // Positions keep their original time slots — dragging a place to a new
        // position moves it into that slot's time, not the other way around.
        // If that puts it somewhere its hours don't cover, the guardrail layer
        // (buildItinerary, re-run below) will surface that as a warning.
        const times = d.stops.map((s) => s.startTime);
        const reordered = arrayMove(d.stops, oldIndex, newIndex);
        const stops = reordered.map((s, i) => ({ ...s, startTime: times[i] }));
        return { ...d, stops };
      })
    );
  }

  function handleAddStop(dayNumber: number, place: Place) {
    setRawDays((prev) =>
      prev.map((d) => {
        if (d.day !== dayNumber) return d;
        const last = d.stops[d.stops.length - 1];
        const lastPlace = last ? placesById.get(last.placeId) : null;
        const startTime = last ? addMinutesToTime(last.startTime, (lastPlace?.durationMinutes ?? 90) + 30) : "10:00";
        const stops = [...d.stops, { placeId: place.id, startTime, note: "Added by you" }].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );
        return { ...d, stops };
      })
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {derived.days.map((d) => (
            <button
              key={d.day}
              onClick={() => setActiveDay(d.day)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                d.day === activeDay ? "bg-indigo-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              Day {d.day}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartOver}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Start over
          </button>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
          >
            {isRegenerating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-1 text-sm font-medium text-red-800">Heads up — {warnings.length} thing(s) to double-check:</p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-red-700">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DayTimeline
            day={day}
            onRemoveStop={(placeId) => handleRemoveStop(day.day, placeId)}
            onAddStop={() => setAddingToDay(day.day)}
            onReorderStops={(oldIndex, newIndex) => handleReorderStops(day.day, oldIndex, newIndex)}
          />
        </div>
        <div className="h-96 lg:col-span-2 lg:h-auto lg:min-h-[500px]">
          {points.length > 0 ? (
            <MapView points={points} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-stone-300 text-sm text-stone-400">
              No mappable stops for this day
            </div>
          )}
        </div>
      </div>

      {itinerary.overallNotes && (
        <div className="rounded-lg bg-stone-100 p-4 text-sm text-stone-700">
          <span className="font-medium">Trip notes: </span>
          {itinerary.overallNotes}
        </div>
      )}

      {addingToDay != null && (
        <AddStopModal
          dayNumber={addingToDay}
          candidates={unusedCandidates}
          dayStops={derived.days.find((d) => d.day === addingToDay)?.stops ?? []}
          onAdd={(place) => handleAddStop(addingToDay, place)}
          onClose={() => setAddingToDay(null)}
        />
      )}
    </div>
  );
}