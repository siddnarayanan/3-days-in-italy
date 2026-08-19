"use client";

import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

const OPTIONS = [
  { value: "any" as const, label: "No preference" },
  { value: "budget" as const, label: "€ Budget" },
  { value: "mid" as const, label: "€€–€€€ Mid-range" },
  { value: "splurge" as const, label: "€€€€ Splurge" },
];

export default function StepBudget({ draft, updateDraft, onNext, onBack }: StepProps) {
  function choose(budget: (typeof OPTIONS)[number]["value"]) {
    updateDraft({ budget });
    onNext();
  }

  return (
    <WizardLayout title="What's your budget?" stepIndex={4} totalSteps={8} onBack={onBack}>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => choose(opt.value)}
            className={`rounded-lg border-2 px-4 py-4 text-sm font-medium transition-colors ${
              draft.budget === opt.value ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </WizardLayout>
  );
}
