import type { DayKey, HoursWindow, ParsedHours } from "./types";

const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const ALL_DAYS = DAY_ORDER;

const DAY_ALIASES: Record<string, DayKey> = {
  mon: "mon",
  monday: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  wed: "wed",
  weds: "wed",
  wednesday: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  fri: "fri",
  friday: "fri",
  sat: "sat",
  saturday: "sat",
  sun: "sun",
  sunday: "sun",
};

function parseTimeToken(token: string): string | null {
  const t = token.trim().toLowerCase();
  // "24:00" / "24" represents midnight at the end of the day — kept as a
  // sentinel rather than folded into "00:00" so range comparisons stay simple.
  if (/^24(:00)?$/.test(t)) return "24:00";
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 24 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Expands "Mon-Sat", "Tues", "Daily", wrapping ranges like "Wed-Mon", into day keys. */
function expandDayGroup(group: string): DayKey[] {
  const cleaned = group.trim().toLowerCase();
  if (cleaned === "daily" || cleaned === "everyday" || cleaned === "every day") {
    return ALL_DAYS;
  }
  const days = new Set<DayKey>();
  for (const part of cleaned.split(",")) {
    const piece = part.trim();
    if (!piece) continue;
    if (piece.includes("-")) {
      const [startTok, endTok] = piece.split("-").map((s) => s.trim());
      const start = DAY_ALIASES[startTok];
      const end = DAY_ALIASES[endTok];
      if (!start || !end) continue;
      let i = DAY_ORDER.indexOf(start);
      const endIdx = DAY_ORDER.indexOf(end);
      while (true) {
        days.add(DAY_ORDER[i]);
        if (i === endIdx) break;
        i = (i + 1) % 7;
      }
    } else {
      const single = DAY_ALIASES[piece];
      if (single) days.add(single);
    }
  }
  return Array.from(days);
}

const RANGE_RE =
  /\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi;

function parseSingleRange(segment: string): HoursWindow | null {
  const m = segment.match(/^(.+?)[-–](.+)$/);
  if (!m) return null;
  const open = parseTimeToken(m[1]);
  const close = parseTimeToken(m[2]);
  if (!open || !close) return null;
  return { open, close };
}

/** Splits a comma-separated list of "H:MM-H:MM" ranges into windows (handles split lunch/dinner service). */
function parseTimeList(str: string): HoursWindow[] | null {
  const windows: HoursWindow[] = [];
  const matches = str.match(RANGE_RE);
  if (!matches) return null;
  for (const raw of matches) {
    const w = parseSingleRange(raw);
    if (w) windows.push(w);
  }
  return windows.length > 0 ? windows : null;
}

const DAY_GROUP_TIME_RE =
  /([A-Za-z]+(?:[\s,-]+[A-Za-z]+)*)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s*,\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)*)/g;

/**
 * Best-effort parse of the dataset's free-text `hours` field. Real examples include
 * "9:00-19:00" (applies daily, no day prefix), "Daily 10:00-24:00",
 * "Mon-Sat 12:30-14:30, 19:30-22:30" (split lunch/dinner service),
 * "Wed-Mon 10:00-18:00" (wraps across the week), and unparseable free text like
 * "Evenings" or "Morning only" — those fall through to `null` and the raw string
 * is shown as-is in the UI rather than guessed at.
 */
export function parseHours(raw: unknown): ParsedHours | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const result: ParsedHours = {};

  const dailyMatch = trimmed.match(/^daily\s+(.*)$/i);
  if (dailyMatch) {
    const windows = parseTimeList(dailyMatch[1]);
    if (windows) {
      for (const d of ALL_DAYS) result[d] = windows;
      return result;
    }
  }

  if (/^\d/.test(trimmed)) {
    const windows = parseTimeList(trimmed);
    if (windows) {
      for (const d of ALL_DAYS) result[d] = windows;
      return result;
    }
  }

  let matched = false;
  let m: RegExpExecArray | null;
  DAY_GROUP_TIME_RE.lastIndex = 0;
  while ((m = DAY_GROUP_TIME_RE.exec(trimmed))) {
    const windows = parseTimeList(m[2]);
    if (!windows) continue;
    const days = expandDayGroup(m[1]);
    if (days.length === 0) continue;
    matched = true;
    for (const d of days) result[d] = windows;
  }

  return matched ? result : null;
}

const WEEKDAY_BY_JS_DAY: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function dayKeyForDate(isoDate: string, dayOffset: number): DayKey | null {
  const base = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + dayOffset);
  return WEEKDAY_BY_JS_DAY[base.getDay()];
}

/** Adds minutes to an "HH:MM" time, clamped to [06:00, 23:45] so suggested slots stay plausible. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + minutes;
  total = Math.max(6 * 60, Math.min(23 * 60 + 45, total));
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timeInWindow(time: string, window: HoursWindow): boolean {
  if (window.close >= window.open) {
    return time >= window.open && time < window.close;
  }
  // Overnight wrap, e.g. "8:00-01:00" (open at 8am, close at 1am next day).
  return time >= window.open || time < window.close;
}

/** Returns a warning string if startTime falls outside every parsed window for that day, else null. */
export function checkHoursConflict(
  parsed: ParsedHours | null,
  dayKey: DayKey | null,
  startTime: string
): string | null {
  if (!parsed || !dayKey) return null;
  const windows = parsed[dayKey];
  if (!windows) return null;
  if (windows === "closed") return "may be closed on this day";
  if (windows.some((w) => timeInWindow(startTime, w))) return null;
  const ranges = windows.map((w) => `${w.open}–${w.close}`).join(", ");
  return `scheduled at ${startTime}, outside typical hours (${ranges})`;
}
