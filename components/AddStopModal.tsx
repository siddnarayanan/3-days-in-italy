"use client";

import { useMemo, useState } from "react";
import { haversineKm } from "@/lib/geo";
import type { ItineraryStop, Place } from "@/lib/types";

interface Props {
  dayNumber: number;
  candidates: Place[];
  dayStops: ItineraryStop[];
  mode?: "add" | "swap";
  onAdd: (place: Place) => void;
  onClose: () => void;
}

export default function AddStopModal({ dayNumber, candidates, dayStops, mode = "add", onAdd, onClose }: Props) {
  const [query, setQuery] = useState("");

  const anchorPoints = useMemo(
    () =>
      dayStops
        .map((s) => s.place)
        .filter((p): p is Place => p != null && p.lat != null && p.lng != null)
        .map((p) => ({ lat: p.lat!, lng: p.lng! })),
    [dayStops]
  );

  const ranked = useMemo(() => {
    const withDistance = candidates.map((place) => {
      let distanceKm: number | null = null;
      if (anchorPoints.length > 0 && place.lat != null && place.lng != null) {
        distanceKm = Math.min(...anchorPoints.map((a) => haversineKm(a.lat, a.lng, place.lat!, place.lng!)));
      }
      return { place, distanceKm };
    });
    withDistance.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return (b.place.rating ?? 0) - (a.place.rating ?? 0);
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
    return withDistance;
  }, [candidates, anchorPoints]);

  const filtered = ranked.filter(({ place }) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      place.name.toLowerCase().includes(q) ||
      place.city.toLowerCase().includes(q) ||
      place.tags.some((t) => t.includes(q)) ||
      place.type.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 p-4">
          <h3 className="font-semibold text-stone-900">
            {mode === "swap" ? "Swap this stop for" : "Add a stop to"} Day {dayNumber}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-stone-400 hover:bg-stone-100">
            ✕
          </button>
        </div>
        <div className="border-b border-stone-200 p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city, or tag..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          {anchorPoints.length > 0 && <p className="mt-1 text-xs text-stone-400">Sorted by distance from this day&apos;s other stops</p>}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 && <p className="p-4 text-center text-sm text-stone-400">No places match your search.</p>}
          <div className="flex flex-col gap-2">
            {filtered.map(({ place, distanceKm }) => (
              <button
                key={place.id}
                onClick={() => {
                  onAdd(place);
                  onClose();
                }}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-stone-900">{place.name}</span>
                    {place.rating != null && <span className="shrink-0 text-xs text-stone-500">★ {place.rating}</span>}
                  </div>
                  <div className="truncate text-xs text-stone-500">
                    {place.type.replace(/_/g, " ")} · {[place.neighborhood, place.city].filter(Boolean).join(", ")}
                    {distanceKm != null && ` · ${distanceKm < 1 ? "<1" : Math.round(distanceKm)}km away`}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                  {mode === "swap" ? "Swap" : "Add"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}