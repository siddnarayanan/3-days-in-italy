import type { RawItinerary } from "./itinerarySchema";
import type { PlanResponse, Preferences } from "./types";

const WIZARD_KEY = "italy-planner:wizard:v1";
const TRIP_KEY = "italy-planner:trip:v1";
const EDITS_KEY = "italy-planner:edits:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — nothing to do, persistence just skips this write
  }
}

function remove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export interface WizardSnapshot<TDraft> {
  stepIndex: number;
  draft: TDraft;
}

// Generic over the draft shape rather than importing WizardDraft directly —
// lib/ stays UI-agnostic; the wizard component supplies its own type at the call site.
export function loadWizardSnapshot<TDraft>(): WizardSnapshot<TDraft> | null {
  return readJSON<WizardSnapshot<TDraft>>(WIZARD_KEY);
}
export function saveWizardSnapshot<TDraft>(stepIndex: number, draft: TDraft): void {
  writeJSON(WIZARD_KEY, { stepIndex, draft });
}
export function clearWizardSnapshot(): void {
  remove(WIZARD_KEY);
}

export interface TripSnapshot {
  preferences: Preferences;
  result: PlanResponse;
}
export function loadTripSnapshot(): TripSnapshot | null {
  return readJSON<TripSnapshot>(TRIP_KEY);
}
export function saveTripSnapshot(trip: TripSnapshot): void {
  writeJSON(TRIP_KEY, trip);
}
export function clearTripSnapshot(): void {
  remove(TRIP_KEY);
}

export interface EditsSnapshot {
  overallNotes: string;
  days: RawItinerary["days"];
}
export function loadEditsSnapshot(): EditsSnapshot | null {
  return readJSON<EditsSnapshot>(EDITS_KEY);
}
export function saveEditsSnapshot(snapshot: EditsSnapshot): void {
  writeJSON(EDITS_KEY, snapshot);
}
export function clearEditsSnapshot(): void {
  remove(EDITS_KEY);
}

export function clearAllPersistedState(): void {
  clearWizardSnapshot();
  clearTripSnapshot();
  clearEditsSnapshot();
}
