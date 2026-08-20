import rawData from "@/data/italy.json";
import { parseHours } from "./hours";
import type { Place } from "./types";

interface RawPlace {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string | null;
  neighborhood: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  hours: string | null;
  duration_minutes: number | null;
  price_range: string | null;
  rating: number | null;
  tags: string[];
  seasonal_notes: string | null;
  booking_required: boolean;
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, "-");
}

function normalizePlace(raw: RawPlace): Place {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    city: raw.city,
    region: raw.region ?? null,
    neighborhood: raw.neighborhood ?? null,
    description: raw.description ?? "",
    tags: Array.from(new Set((raw.tags ?? []).map(normalizeTag))),
    rating: raw.rating ?? null,
    priceRange: raw.price_range ?? null,
    durationMinutes: raw.duration_minutes ?? null,
    hoursRaw: raw.hours ?? null,
    hoursParsed: parseHours(raw.hours),
    seasonalNotes: raw.seasonal_notes ?? null,
    bookingRequired: Boolean(raw.booking_required),
    lat: raw.latitude ?? null,
    lng: raw.longitude ?? null,
  };
}

let cached: Place[] | null = null;

export function getPlaces(): Place[] {
  if (!cached) cached = (rawData as RawPlace[]).map(normalizePlace);
  return cached;
}

