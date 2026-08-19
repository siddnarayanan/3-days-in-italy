"use client";

import { useMemo, useState } from "react";
import { TRAVEL_RADIUS_TIERS, reachableCitiesAt } from "@/lib/homeBase";
import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

export default function StepTravel({ places, draft, updateDraft, onNext, onBack }: StepProps) {
  const homeBase = draft.homeBase!;
  const [wantsTravel, setWantsTravel] = useState<boolean | null>(
    draft.travelRadiusKm == null ? null : draft.travelRadiusKm > 0
  );
  const [radiusKm, setRadiusKm] = useState<number | null>(
    draft.travelRadiusKm && draft.travelRadiusKm > 0 ? draft.travelRadiusKm : null
  );

  const tierInfo = useMemo(
    () =>
      TRAVEL_RADIUS_TIERS.map((tier) => ({
        ...tier,
        cities: reachableCitiesAt(places, homeBase, tier.km),
      })),
    [places, homeBase]
  );

  function selectNo() {
    setWantsTravel(false);
    setRadiusKm(null);
  }

  function confirm() {
    if (wantsTravel === false) {
      updateDraft({ travelRadiusKm: 0 });
      onNext();
    } else if (wantsTravel === true && radiusKm != null) {
      updateDraft({ travelRadiusKm: radiusKm });
      onNext();
    }
  }

  const canContinue = wantsTravel === false || (wantsTravel === true && radiusKm != null);

  return (
    <WizardLayout
      title={`Explore beyond ${homeBase}?`}
      subtitle="You can stay close, or take day trips from your home base."
      stepIndex={1}
      totalSteps={8}
      onBack={onBack}
    >
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={selectNo}
          className={`rounded-lg border-2 px-4 py-4 text-left transition-colors ${
            wantsTravel === false ? "border-indigo-600 bg-indigo-50" : "border-stone-300 bg-white hover:border-stone-400"
          }`}
        >
          <div className="font-medium text-stone-900">No, just {homeBase}</div>
          <div className="text-xs text-stone-500">Keep it simple, stay local</div>
        </button>
        <button
          onClick={() => setWantsTravel(true)}
          className={`rounded-lg border-2 px-4 py-4 text-left transition-colors ${
            wantsTravel === true ? "border-indigo-600 bg-indigo-50" : "border-stone-300 bg-white hover:border-stone-400"
          }`}
        >
          <div className="font-medium text-stone-900">Yes, I&apos;m open to day trips</div>
          <div className="text-xs text-stone-500">See more of the region</div>
        </button>
      </div>

      {wantsTravel === true && (
        <div className="mt-5 flex flex-col gap-2">
          <p className="text-sm font-medium text-stone-700">How far are you willing to travel?</p>
          {tierInfo.map((tier) => (
            <button
              key={tier.km}
              onClick={() => setRadiusKm(tier.km)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                radiusKm === tier.km ? "border-indigo-600 bg-indigo-50" : "border-stone-300 bg-white hover:border-stone-400"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-stone-900">{tier.label}</span>
                <span className="text-xs text-stone-500">{tier.hint}</span>
              </div>
              <div className="mt-0.5 text-xs text-stone-500">
                {tier.cities.length > 0 ? `Includes ${tier.cities.join(", ")}` : "No additional cities in range"}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={confirm}
        disabled={!canContinue}
        className="mt-6 w-full rounded-lg bg-indigo-700 px-6 py-2.5 font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </WizardLayout>
  );
}
