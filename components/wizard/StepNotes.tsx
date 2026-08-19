"use client";

import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

export default function StepNotes({ draft, updateDraft, onNext, onBack }: StepProps) {
  return (
    <WizardLayout
      title="Anything else?"
      subtitle="Optional — traveling with kids, want one splurge dinner, avoid crowds, love wine..."
      stepIndex={6}
      totalSteps={8}
      onBack={onBack}
    >
      <textarea
        value={draft.notes}
        onChange={(e) => updateDraft({ notes: e.target.value })}
        rows={4}
        placeholder="Tell us more..."
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
      />

      <button
        onClick={onNext}
        className="mt-6 w-full rounded-lg bg-indigo-700 px-6 py-2.5 font-medium text-white hover:bg-indigo-800"
      >
        {draft.notes.trim() ? "Continue" : "Skip"}
      </button>
    </WizardLayout>
  );
}
