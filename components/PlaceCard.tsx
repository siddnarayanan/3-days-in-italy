import type { HTMLAttributes } from "react";
import type { ItineraryStop } from "@/lib/types";

const TYPE_ICONS: Record<string, string> = {
  historic_site: "🏛️",
  museum: "🖼️",
  restaurant: "🍝",
  cafe: "☕",
  market: "🧺",
  neighborhood: "🚶",
  viewpoint: "🌄",
  park: "🌳",
  shop: "🛍️",
  experience: "✨",
};

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

interface Props {
  stop: ItineraryStop;
  onRemove?: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export default function PlaceCard({ stop, onRemove, dragHandleProps, isDragging }: Props) {
  const place = stop.place;
  if (!place) return null;

  return (
    <div
      className={`flex gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          aria-label={`Reorder ${place.name}`}
          title="Drag to reorder"
          className="flex shrink-0 cursor-grab touch-none items-center text-stone-300 hover:text-stone-500 active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      )}
      <div className="flex w-16 shrink-0 flex-col items-center text-center">
        <span className="text-sm font-semibold text-indigo-800">{stop.startTime}</span>
        <span className="mt-1 text-2xl">{TYPE_ICONS[place.type] ?? "📍"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold text-stone-900">{place.name}</h3>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            {place.rating != null && <span>★ {place.rating}</span>}
            {place.priceRange && <span>{place.priceRange}</span>}
            {onRemove && (
              <button
                onClick={onRemove}
                aria-label={`Remove ${place.name}`}
                title="Remove from itinerary"
                className="rounded-full px-1.5 py-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <p className="mt-0.5 text-xs text-stone-500">
          {[place.neighborhood, place.city].filter(Boolean).join(", ")}
          {place.durationMinutes ? ` · ~${place.durationMinutes} min` : ""}
        </p>
        <p className="mt-2 text-sm text-stone-700">{place.description}</p>
        <p className="mt-2 text-sm italic text-indigo-800">{stop.note}</p>

        {place.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {place.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {place.bookingRequired && (
          <p className="mt-2 text-xs font-medium text-orange-700">⚠ Booking required — reserve ahead</p>
        )}
        {place.seasonalNotes && <p className="mt-1 text-xs text-stone-500">Note: {place.seasonalNotes}</p>}
        {place.hoursRaw && <p className="mt-1 text-xs text-stone-400">Hours: {place.hoursRaw}</p>}

        {stop.warnings.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {stop.warnings.map((w, i) => (
              <p key={i} className="text-xs font-medium text-red-700">
                ⚠ {w}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
