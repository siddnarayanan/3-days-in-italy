export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface HoursWindow {
  open: string; // "HH:MM", 24h
  close: string; // "HH:MM", 24h
}

export type ParsedHours = Partial<Record<DayKey, HoursWindow[] | "closed">>;

export interface Place {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string | null;
  neighborhood: string | null;
  description: string;
  tags: string[];
  rating: number | null;
  priceRange: string | null;
  durationMinutes: number | null;
  hoursRaw: string | null;
  hoursParsed: ParsedHours | null;
  seasonalNotes: string | null;
  bookingRequired: boolean;
  lat: number | null;
  lng: number | null;
}

export interface Preferences {
  homeBase: string; // a concrete city, always resolved client-side before submission (never "anywhere")
  travelRadiusKm: number; // 0 = stay in homeBase only; otherwise the max distance from homeBase to include
  pace: "relaxed" | "moderate" | "packed";
  interests: string[]; // tag values
  budget: "any" | "budget" | "mid" | "splurge";
  notes: string;
  startDate: string | null; // ISO yyyy-mm-dd, optional, used for weekday-aware hours checks
}

export interface ItineraryStop {
  placeId: string;
  startTime: string; // "HH:MM"
  note: string; // 1-sentence reason this stop was chosen / how it fits
  place: Place | null; // joined server-side; null if id somehow didn't match
  warnings: string[];
}

export interface ItineraryDay {
  day: number;
  theme: string;
  summary: string;
  stops: ItineraryStop[];
  warnings: string[];
}

export interface Itinerary {
  days: ItineraryDay[];
  overallNotes: string;
}

export interface PlanResponse {
  itinerary: Itinerary;
  warnings: string[];
  // The entire dataset (not just the home base + travel radius filtered set
  // generation used) — manual "add a stop" is a deliberate override and
  // shouldn't be bound by that earlier choice. Lets the client do add/remove
  // without a round-trip.
  availablePlaces: Place[];
}
