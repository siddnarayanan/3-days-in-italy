import { jsPDF } from "jspdf";
import { haversineKm, estimateTravelMinutes, estimateTravelMode } from "./geo";
import type { Itinerary, Preferences } from "./types";

const MARGIN = 15;
const COLOR_INDIGO: [number, number, number] = [67, 56, 202]; // indigo-700
const COLOR_STONE_700: [number, number, number] = [68, 64, 60];
const COLOR_STONE_500: [number, number, number] = [120, 113, 108];
const COLOR_RED: [number, number, number] = [185, 28, 28];

/** Builds a print-friendly PDF of the itinerary and triggers a browser download. No server round-trip. */
export function downloadItineraryPdf(itinerary: Itinerary, preferences: Preferences): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  function ensureSpace(height: number) {
    if (y + height > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function block(
    text: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; gap?: number } = {}
  ) {
    const { size = 10, style = "normal", color = COLOR_STONE_700, gap = 2 } = opts;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = size * 0.45;
    ensureSpace(lines.length * lineHeight + gap);
    doc.text(lines, MARGIN, y);
    y += lines.length * lineHeight + gap;
  }

  function rule() {
    ensureSpace(4);
    doc.setDrawColor(224, 221, 217); // stone-200
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 5;
  }

  // Header
  block("3 Days in Italy", { size: 20, style: "bold", color: COLOR_INDIGO, gap: 1 });
  const radiusLine =
    preferences.travelRadiusKm > 0
      ? `${preferences.homeBase} + day trips up to ~${preferences.travelRadiusKm}km`
      : preferences.homeBase;
  const metaParts = [radiusLine, preferences.startDate ? `Starting ${preferences.startDate}` : null].filter(
    (p): p is string => p != null
  );
  block(metaParts.join("  ·  "), { size: 10, color: COLOR_STONE_500, gap: 6 });

  for (const day of itinerary.days) {
    rule();
    block(`Day ${day.day}: ${day.theme}`, { size: 14, style: "bold", color: COLOR_INDIGO, gap: 1 });
    if (day.summary) block(day.summary, { size: 10, style: "italic", color: COLOR_STONE_500, gap: 3 });

    for (let i = 0; i < day.stops.length; i++) {
      const stop = day.stops[i];
      const place = stop.place;
      if (!place) continue;

      ensureSpace(10);
      block(`${stop.startTime}   ${place.name}`, { size: 11.5, style: "bold", color: [28, 25, 23], gap: 0.5 });

      const subline = [
        place.type.replace(/_/g, " "),
        [place.neighborhood, place.city].filter(Boolean).join(", "),
        place.priceRange,
        place.rating != null ? `${place.rating}★` : null,
        place.durationMinutes ? `~${place.durationMinutes} min` : null,
      ]
        .filter((p): p is string => Boolean(p))
        .join("  ·  ");
      block(subline, { size: 9, color: COLOR_STONE_500, gap: 2 });

      if (place.description) block(place.description, { size: 9.5, gap: 1.5 });
      block(stop.note, { size: 9.5, style: "italic", color: COLOR_INDIGO, gap: 1.5 });

      if (place.bookingRequired) {
        block("Booking required — reserve ahead", { size: 9, style: "bold", color: [194, 120, 3], gap: 1 });
      }
      if (place.seasonalNotes) block(`Note: ${place.seasonalNotes}`, { size: 9, color: COLOR_STONE_500, gap: 1 });
      if (place.hoursRaw) block(`Hours: ${place.hoursRaw}`, { size: 9, color: COLOR_STONE_500, gap: 1 });

      for (const w of stop.warnings) {
        block(`⚠ ${w}`, { size: 9, style: "bold", color: COLOR_RED, gap: 1 });
      }

      const next = day.stops[i + 1]?.place;
      if (place.lat != null && place.lng != null && next?.lat != null && next?.lng != null) {
        const km = haversineKm(place.lat, place.lng, next.lat, next.lng);
        const minutes = estimateTravelMinutes(km);
        const mode = estimateTravelMode(km) === "walk" ? "walk" : "drive";
        block(`↓ ~${minutes} min ${mode} to next stop`, { size: 8.5, color: COLOR_STONE_500, gap: 1 });
      }

      y += 3;
    }

    for (const w of day.warnings) {
      block(`⚠ ${w}`, { size: 9, style: "bold", color: COLOR_RED, gap: 1 });
    }
  }

  if (itinerary.overallNotes) {
    rule();
    block("Trip notes", { size: 11, style: "bold", color: COLOR_INDIGO, gap: 1 });
    block(itinerary.overallNotes, { size: 9.5, gap: 1 });
  }

  const slug = preferences.homeBase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`3-days-in-italy-${slug || "trip"}.pdf`);
}
