"use client";

import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

const PACE_LABELS: Record<string, string> = { relaxed: "Relaxed", moderate: "Moderate", packed: "Packed" };
const BUDGET_LABELS: Record<string, string> = {
  any: "No preference",
  budget: "€ Budget",
  mid: "€€–€€€ Mid-range",
  splurge: "€€€€ Splurge",
};

interface Props extends StepProps {
  onJumpTo: (stepIndex: number) => void;
  isSubmitting: boolean;
}

export default function StepReview({ draft, onNext, onBack, onJumpTo, isSubmitting }: Props) {
  const rows: { label: string; value: string; step: number }[] = [
    {
      label: "Home base",
      value: draft.travelRadiusKm ? `${draft.homeBase} (+ day trips up to ${draft.travelRadiusKm}km)` : `${draft.homeBase} only`,
      step: 0,
    },
    { label: "Pace", value: draft.pace ? PACE_LABELS[draft.pace] : "—", step: 2 },
    { label: "Interests", value: draft.interests.length ? draft.interests.join(", ") : "No strong preference", step: 3 },
    { label: "Budget", value: draft.budget ? BUDGET_LABELS[draft.budget] : "—", step: 4 },
    { label: "Start date", value: draft.startDate ?? "Not set", step: 5 },
    { label: "Notes", value: draft.notes.trim() || "None", step: 6 },
  ];

  return (
    <WizardLayout title="Ready to build your trip?" stepIndex={7} totalSteps={8} onBack={onBack}>
      <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-stone-400">{row.label}</div>
              <div className="truncate text-sm text-stone-800">{row.value}</div>
            </div>
            <button onClick={() => onJumpTo(row.step)} className="shrink-0 text-sm text-indigo-700 hover:underline">
              Edit
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={isSubmitting}
        className="mt-6 w-full rounded-lg bg-indigo-700 px-6 py-3 font-medium text-white hover:bg-indigo-800 disabled:opacity-50"
      >
        {isSubmitting ? "Building your itinerary…" : "Build my itinerary"}
      </button>
    </WizardLayout>
  );
}
