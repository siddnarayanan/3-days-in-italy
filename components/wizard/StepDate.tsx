"use client";

import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

export default function StepDate({ draft, updateDraft, onNext, onBack }: StepProps) {
  return (
    <WizardLayout
      title="When are you starting?"
      subtitle="Optional — helps us check opening hours accurately against the day of the week."
      stepIndex={5}
      totalSteps={8}
      onBack={onBack}
    >
      <input
        type="date"
        value={draft.startDate ?? ""}
        onChange={(e) => updateDraft({ startDate: e.target.value || null })}
        className="w-full max-w-xs rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
      />

      <button
        onClick={onNext}
        className="mt-6 w-full rounded-lg bg-indigo-700 px-6 py-2.5 font-medium text-white hover:bg-indigo-800"
      >
        {draft.startDate ? "Continue" : "Skip"}
      </button>
    </WizardLayout>
  );
}
