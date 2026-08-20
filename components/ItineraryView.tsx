"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { buildItinerary } from "@/lib/validate";
import { addMinutesToTime } from "@/lib/hours";
import { downloadItineraryPdf } from "@/lib/exportPdf";
import { reorderStopsKeepingTimes } from "@/lib/reorder";
import { loadEditsSnapshot, saveEditsSnapshot } from "@/lib/persistence";
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

interface StopModalState {
  day: number;
  replacingPlaceId: string | null; // null = adding a new stop; set = swapping this one out
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
  // A page refresh shouldn't lose manual edits — restore them if they belong
  // to this same generated itinerary (overallNotes is unique enough per
  // generation to use as a cheap fingerprint), otherwise start from scratch.
  const [rawDays, setRawDays] = useState<RawItinerary["days"]>(() => {
    const snapshot = loadEditsSnapshot();
    if (snapshot && snapshot.overallNotes === itinerary.overallNotes) return snapshot.days;
    return toRawDays(itinerary);
  });
  const [stopModal, setStopModal] = useState<StopModalState | null>(null);

  // A regenerate produces a brand-new itinerary object — resync local edits to it
  // by adjusting state during render (React's recommended pattern for this,
  // rather than an effect that would cause an extra render pass).
  const [syncedItinerary, setSyncedItinerary] = useState(itinerary);
  if (itinerary !== syncedItinerary) {
    setSyncedItinerary(itinerary);
    setRawDays(toRawDays(itinerary));
    setActiveDay(1);
  }

  useEffect(() => {
    saveEditsSnapshot({ overallNotes: itinerary.overallNotes, days: rawDays });
  }, [rawDays, itinerary.overallNotes]);

  const placesById = useMemo(() => new Map(availablePlaces.map((p) => [p.id, p])), [availablePlaces]);

  // Re-derive the joined + validated itinerary from local edits on every change —
  // reuses the exact same guardrail logic (lib/validate.ts) the server used, so
  // manual add/remove/swap/reorder get fresh hours/duplicate/geo-spread checks
  // for free, with no round-trip.
  const derived = useMemo(
    () => buildItinerary({ days: rawDays, overallNotes: itinerary.overallNotes }, placesById, preferences),
    [rawDays, placesById, preferences, itinerary.overallNotes]
  );
  const day = derived.days.find((d) => d.day === activeDay) ?? derived.days[0];
  const isLastDay = day.day === derived.days[derived.days.length - 1]?.day;

  const usedPlaceIds = useMemo(() => new Set(rawDays.flatMap((d) => d.stops.map((s) => s.placeId))), [rawDays]);
  const unusedCandidates = useMemo(
    () => availablePlaces.filter((p) => !usedPlaceIds.has(p.id)),
    [availablePlaces, usedPlaceIds]
  );

  const mappableStops = useMemo(() => day.stops.filter((s) => s.place?.lat != null && s.place?.lng != null), [day]);
  const points = useMemo(
    () =>
      mappableStops.map((s, i) => ({ lat: s.place!.lat!, lng: s.place!.lng!, label: s.place!.name, order: i + 1 })),
    [mappableStops]
  );
  // Same numbering as the map pins, so a card and its pin always match.
  const stopNumbers = useMemo(
    () => new Map(mappableStops.map((s, i) => [s.placeId, i + 1])),
    [mappableStops]
  );

  function handleRemoveStop(dayNumber: number, placeId: string) {
    setRawDays((prev) =>
      prev.map((d) => (d.day === dayNumber ? { ...d, stops: d.stops.filter((s) => s.placeId !== placeId) } : d))
    );
  }

  function handleReorderStops(dayNumber: number, oldIndex: number, newIndex: number) {
    // If the new position puts a place somewhere its hours don't cover, the
    // guardrail layer (buildItinerary, re-run below) surfaces that as a warning.
    setRawDays((prev) =>
      prev.map((d) => (d.day === dayNumber ? { ...d, stops: reorderStopsKeepingTimes(d.stops, oldIndex, newIndex) } : d))
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

  function handleSwapStop(dayNumber: number, oldPlaceId: string, newPlace: Place) {
    // Replaces in place — same position, same time slot — rather than
    // remove-then-add, which would drop the swap at the end of the day instead.
    setRawDays((prev) =>
      prev.map((d) =>
        d.day === dayNumber
          ? {
              ...d,
              stops: d.stops.map((s) =>
                s.placeId === oldPlaceId ? { placeId: newPlace.id, startTime: s.startTime, note: "Swapped in by you" } : s
              ),
            }
          : d
      )
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
          {isLastDay && (
            <button
              onClick={() => downloadItineraryPdf(derived, preferences)}
              className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              Download Itinerary
            </button>
          )}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DayTimeline
            day={day}
            onRemoveStop={(placeId) => handleRemoveStop(day.day, placeId)}
            onAddStop={() => setStopModal({ day: day.day, replacingPlaceId: null })}
            onSwapStop={(placeId) => setStopModal({ day: day.day, replacingPlaceId: placeId })}
            onReorderStops={(oldIndex, newIndex) => handleReorderStops(day.day, oldIndex, newIndex)}
            stopNumbers={stopNumbers}
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

      {stopModal != null &&
        (() => {
          const modalDay = derived.days.find((d) => d.day === stopModal.day);
          const dayStops = (modalDay?.stops ?? []).filter((s) => s.placeId !== stopModal.replacingPlaceId);
          return (
            <AddStopModal
              dayNumber={stopModal.day}
              candidates={unusedCandidates}
              dayStops={dayStops}
              mode={stopModal.replacingPlaceId ? "swap" : "add"}
              onAdd={(place) =>
                stopModal.replacingPlaceId
                  ? handleSwapStop(stopModal.day, stopModal.replacingPlaceId, place)
                  : handleAddStop(stopModal.day, place)
              }
              onClose={() => setStopModal(null)}
            />
          );
        })()}
    </div>
  );
}
