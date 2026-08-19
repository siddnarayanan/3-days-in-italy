"use client";

import { useState } from "react";
import type { Place, Preferences } from "@/lib/types";
import { INITIAL_DRAFT, type WizardDraft } from "./types";
import StepLocation from "./StepLocation";
import StepTravel from "./StepTravel";
import StepPace from "./StepPace";
import StepInterests from "./StepInterests";
import StepBudget from "./StepBudget";
import StepDate from "./StepDate";
import StepNotes from "./StepNotes";
import StepReview from "./StepReview";

interface Props {
  places: Place[];
  onSubmit: (preferences: Preferences) => void;
  isSubmitting: boolean;
  submitError: string | null;
}

const LAST_STEP = 7;

export default function TripWizard({ places, onSubmit, isSubmitting, submitError }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>(INITIAL_DRAFT);

  function updateDraft(patch: Partial<WizardDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function next() {
    setStepIndex((i) => Math.min(i + 1, LAST_STEP));
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleSubmit() {
    if (!draft.homeBase || draft.travelRadiusKm == null || !draft.pace || !draft.budget) return;
    onSubmit({
      homeBase: draft.homeBase,
      travelRadiusKm: draft.travelRadiusKm,
      pace: draft.pace,
      interests: draft.interests,
      budget: draft.budget,
      notes: draft.notes.trim(),
      startDate: draft.startDate,
    });
  }

  const stepProps = { places, draft, updateDraft, onNext: next, onBack: back };

  return (
    <div>
      {stepIndex === 0 && <StepLocation {...stepProps} />}
      {stepIndex === 1 && <StepTravel {...stepProps} />}
      {stepIndex === 2 && <StepPace {...stepProps} />}
      {stepIndex === 3 && <StepInterests {...stepProps} />}
      {stepIndex === 4 && <StepBudget {...stepProps} />}
      {stepIndex === 5 && <StepDate {...stepProps} />}
      {stepIndex === 6 && <StepNotes {...stepProps} />}
      {stepIndex === 7 && (
        <StepReview {...stepProps} onNext={handleSubmit} onJumpTo={setStepIndex} isSubmitting={isSubmitting} />
      )}

      {submitError && stepIndex === LAST_STEP && (
        <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {submitError}
        </div>
      )}
    </div>
  );
}
