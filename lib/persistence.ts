import type { RawItinerary } from "./itinerarySchema";
import type { PlanResponse, Preferences } from "./types";

// A page refresh shouldn't lose either an in-progress wizard or a finished
// (possibly hand-edited) itinerary. Client-side only — nothing here talks to
// a server, matching the rest of the app's no-external-dependency design.
// Every read/write is wrapped defensively: localStorage can throw (private
// browsing, storage full, SSR with no `window`) and persistence is a nicety,
// never something that should break the app if it fails.

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
  // overallNotes is generated fresh text per generation, unique enough to use
  // as a cheap fingerprint: only restore edits that belong to the itinerary
  // currently being viewed, not stale edits from a since-regenerated one.
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
