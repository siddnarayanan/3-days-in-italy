"use client";

import { useMemo } from "react";
import WizardLayout from "./WizardLayout";
import type { StepProps } from "./types";

export default function StepInterests({ places, draft, updateDraft, onNext, onBack }: StepProps) {
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) for (const t of p.tags) set.add(t);
    return Array.from(set).sort();
  }, [places]);

  function toggle(tag: string) {
    const next = draft.interests.includes(tag)
      ? draft.interests.filter((t) => t !== tag)
      : [...draft.interests, tag];
    updateDraft({ interests: next });
  }

  return (
    <WizardLayout
      title="What are you interested in?"
      subtitle="Pick a few, or skip if you're open to anything."
      stepIndex={3}
      totalSteps={8}
      onBack={onBack}
    >
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              draft.interests.includes(tag)
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="mt-6 w-full rounded-lg bg-indigo-700 px-6 py-2.5 font-medium text-white hover:bg-indigo-800"
      >
        {draft.interests.length > 0 ? "Continue" : "Skip — no strong preference"}
      </button>
    </WizardLayout>
  );
}
