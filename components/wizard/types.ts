import type { Place, Preferences } from "@/lib/types";

export interface WizardDraft {
  homeBase: string | null;
  homeBaseAutoPicked: boolean;
  travelRadiusKm: number | null; // null = not yet answered
  pace: Preferences["pace"] | null;
  interests: string[];
  budget: Preferences["budget"] | null;
  startDate: string | null;
  notes: string;
}

export const INITIAL_DRAFT: WizardDraft = {
  homeBase: null,
  homeBaseAutoPicked: false,
  travelRadiusKm: null,
  pace: null,
  interests: [],
  budget: null,
  startDate: null,
  notes: "",
};

export interface StepProps {
  places: Place[];
  draft: WizardDraft;
  updateDraft: (patch: Partial<WizardDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}
