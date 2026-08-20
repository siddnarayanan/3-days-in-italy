"use client";

import { useState } from "react";
import { loadTripSnapshot, saveTripSnapshot, clearWizardSnapshot, clearAllPersistedState } from "@/lib/persistence";
import type { Place, PlanResponse, Preferences } from "@/lib/types";
import TripWizard from "./wizard/TripWizard";
import ItineraryView from "./ItineraryView";

interface Props {
  places: Place[];
}

interface Trip {
  preferences: Preferences;
  result: PlanResponse;
}

export default function PlannerApp({ places }: Props) {
  const [trip, setTrip] = useState<Trip | null>(() => loadTripSnapshot());
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  async function requestPlan(prefs: Preferences, isRegenerate: boolean) {
    setIsLoading(true);
    if (isRegenerate) setRegenerateError(null);
    else setFormError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data: PlanResponse = await res.json();
      setTrip({ preferences: prefs, result: data });
      saveTripSnapshot({ preferences: prefs, result: data });
      clearWizardSnapshot();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (isRegenerate) setRegenerateError(message);
      else setFormError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(prefs: Preferences) {
    requestPlan(prefs, false);
  }

  function handleRegenerate() {
    if (trip) requestPlan(trip.preferences, true);
  }

  function handleStartOver() {
    setTrip(null);
    setFormError(null);
    setRegenerateError(null);
    clearAllPersistedState();
  }

  if (!trip) {
    return <TripWizard places={places} onSubmit={handleSubmit} isSubmitting={isLoading} submitError={formError} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {regenerateError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Regeneration failed: {regenerateError}
        </div>
      )}
      <ItineraryView
        itinerary={trip.result.itinerary}
        preferences={trip.preferences}
        availablePlaces={trip.result.availablePlaces}
        onRegenerate={handleRegenerate}
        onStartOver={handleStartOver}
        isRegenerating={isLoading}
      />
    </div>
  );
}
