import { haversineKm, estimateTravelMinutes, estimateTravelMode } from "@/lib/geo";
import type { ItineraryStop } from "@/lib/types";

interface Props {
  from: ItineraryStop;
  to: ItineraryStop;
}

export default function TravelConnector({ from, to }: Props) {
  const a = from.place;
  const b = to.place;
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;

  const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
  const minutes = estimateTravelMinutes(km);
  const mode = estimateTravelMode(km);

  return (
    <div className="flex items-center gap-2 pl-8 text-xs text-stone-400">
      <div className="h-4 w-px border-l border-dashed border-stone-300" />
      <span>
        {mode === "walk" ? "🚶" : "🚗"} ~{minutes} min to next stop
      </span>
    </div>
  );
}
