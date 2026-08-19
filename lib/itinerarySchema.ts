import { z } from "zod";

export const RawStopSchema = z.object({
  placeId: z.string(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be 24h HH:MM"),
  note: z.string(),
});

export const RawDaySchema = z.object({
  day: z.number().int().min(1).max(3),
  theme: z.string(),
  summary: z.string(),
  stops: z.array(RawStopSchema).min(1).max(7),
});

export const RawItinerarySchema = z.object({
  days: z.array(RawDaySchema).length(3),
  overallNotes: z.string(),
});

export type RawItinerary = z.infer<typeof RawItinerarySchema>;

// JSON Schema passed to Claude as a forced tool call. Kept in sync with the
// Zod schema above by hand — Anthropic's tool input_schema doesn't run Zod
// directly, and the Zod pass afterward is what actually enforces this shape.
export const ITINERARY_TOOL = {
  name: "build_itinerary",
  description:
    "Submit the finished 3-day Italy itinerary, built entirely from the provided place list.",
  input_schema: {
    type: "object" as const,
    properties: {
      days: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            day: { type: "integer", enum: [1, 2, 3] },
            theme: {
              type: "string",
              description: "Short label for the day, e.g. 'Historic Rome & Trastevere Evening'",
            },
            summary: {
              type: "string",
              description: "1-2 sentence rationale for how this day fits the traveler's preferences",
            },
            stops: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  placeId: { type: "string", description: "Must exactly match an id from the provided place list" },
                  startTime: { type: "string", description: "24h HH:MM, e.g. '09:30'" },
                  note: { type: "string", description: "1 sentence on why this stop, at this time, in this order" },
                },
                required: ["placeId", "startTime", "note"],
              },
            },
          },
          required: ["day", "theme", "summary", "stops"],
        },
      },
      overallNotes: {
        type: "string",
        description: "1-2 sentences on the trip as a whole (pacing, what was deliberately left out, etc.)",
      },
    },
    required: ["days", "overallNotes"],
  },
};
