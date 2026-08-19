"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { groupCitiesByRegion, getCitySummary, getCityCentroid, pickRandomHomeBase } from "@/lib/homeBase";
import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

const MapView = dynamic(() => import("../MapView"), { ssr: false });

export default function StepLocation({ places, draft, updateDraft, onNext }: StepProps) {
  const [pickedCity, setPickedCity] = useState<string | null>(draft.homeBase);
  const [wasAuto, setWasAuto] = useState(draft.homeBaseAutoPicked);
  const regions = useMemo(() => groupCitiesByRegion(places), [places]);

  function choose(city: string, auto: boolean) {
    setPickedCity(city);
    setWasAuto(auto);
  }

  function confirm() {
    if (!pickedCity) return;
    updateDraft({ homeBase: pickedCity, homeBaseAutoPicked: wasAuto });
    onNext();
  }

  if (pickedCity) {
    const summary = getCitySummary(places, pickedCity);
    const center = getCityCentroid(places, pickedCity);
    const previewPoints = places
      .filter((p) => p.city === pickedCity && p.lat != null && p.lng != null)
      .map((p, i) => ({ lat: p.lat!, lng: p.lng!, label: p.name, order: i + 1 }));

    return (
      <WizardLayout title="Where in Italy?" stepIndex={0} totalSteps={8}>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-800">
            {wasAuto ? "Here's your home base:" : "Your home base:"}
          </p>
          <h3 className="mt-1 text-2xl font-bold text-stone-900">{pickedCity}</h3>
          <p className="text-sm text-stone-600">{summary.region}</p>
          <p className="mt-2 text-sm text-stone-700">
            {summary.count} places to explore
            {summary.topTags.length > 0 && <> · known for {summary.topTags.join(", ")}</>}
          </p>
        </div>

        {center && previewPoints.length > 0 && (
          <div className="mt-4 h-64 overflow-hidden rounded-xl">
            <MapView points={previewPoints} variant="preview" />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setPickedCity(null)}
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
          >
            Choose a different city
          </button>
          <button
            onClick={confirm}
            className="flex-1 rounded-lg bg-indigo-700 px-6 py-2.5 font-medium text-white hover:bg-indigo-800"
          >
            Continue
          </button>
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      title="Where in Italy?"
      subtitle="Pick a home base for your trip, or let us surprise you."
      stepIndex={0}
      totalSteps={8}
    >
      <button
        onClick={() => choose(pickRandomHomeBase(places), true)}
        className="mb-6 w-full rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50 px-4 py-4 text-center font-medium text-indigo-800 hover:bg-indigo-100"
      >
        ✨ Surprise me — pick a home base for me
      </button>

      <div className="flex flex-col gap-5">
        {regions.map(({ region, cities }) => (
          <div key={region}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">{region}</p>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => choose(city, false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:border-indigo-600 hover:text-indigo-800"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </WizardLayout>
  );
}
