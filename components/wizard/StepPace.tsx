"use client";

import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

const OPTIONS = [
  { value: "relaxed" as const, label: "Relaxed", hint: "2-3 stops/day, room to wander" },
  { value: "moderate" as const, label: "Moderate", hint: "3-4 stops/day" },
  { value: "packed" as const, label: "Packed", hint: "4-6 stops/day, see it all" },
];

export default function StepPace({ draft, updateDraft, onNext, onBack }: StepProps) {
  function choose(pace: (typeof OPTIONS)[number]["value"]) {
    updateDraft({ pace });
    onNext();
  }

  return (
    <WizardLayout title="What pace do you like?" stepIndex={2} totalSteps={8} onBack={onBack}>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => choose(opt.value)}
            className={`rounded-lg border-2 px-4 py-4 text-left transition-colors ${
              draft.pace === opt.value ? "border-indigo-600 bg-indigo-50" : "border-stone-300 bg-white hover:border-stone-400"
            }`}
          >
            <div className="font-medium text-stone-900">{opt.label}</div>
            <div className="text-sm text-stone-500">{opt.hint}</div>
          </button>
        ))}
      </div>
    </WizardLayout>
  );
}
