import { parseHours, checkHoursConflict, dayKeyForDate, addMinutesToTime } from "./hours";

describe("parseHours", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(parseHours(null)).toBeNull();
    expect(parseHours(undefined)).toBeNull();
    expect(parseHours("")).toBeNull();
  });

  it("applies a bare time range to every day", () => {
    const parsed = parseHours("9:00-19:00");
    expect(parsed).not.toBeNull();
    for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const) {
      expect(parsed![day]).toEqual([{ open: "09:00", close: "19:00" }]);
    }
  });

  it("handles a 'Daily' prefix", () => {
    const parsed = parseHours("Daily 10:00-24:00");
    expect(parsed!.mon).toEqual([{ open: "10:00", close: "24:00" }]);
    expect(parsed!.sun).toEqual([{ open: "10:00", close: "24:00" }]);
  });

  it("handles a day range with a single window", () => {
    const parsed = parseHours("Mon-Sat 10:00-18:00");
    expect(parsed!.mon).toEqual([{ open: "10:00", close: "18:00" }]);
    expect(parsed!.sat).toEqual([{ open: "10:00", close: "18:00" }]);
    expect(parsed!.sun).toBeUndefined();
  });

  it("handles split lunch/dinner service (multiple windows on the same days)", () => {
    const parsed = parseHours("Mon-Sat 12:30-14:30, 19:30-22:30");
    expect(parsed!.mon).toEqual([
      { open: "12:30", close: "14:30" },
      { open: "19:30", close: "22:30" },
    ]);
    expect(parsed!.sun).toBeUndefined();
  });

  it("handles different windows for different day groups in one string", () => {
    const parsed = parseHours("Mon-Sat 9:30-17:15, Sun 14:00-17:00");
    expect(parsed!.mon).toEqual([{ open: "09:30", close: "17:15" }]);
    expect(parsed!.sun).toEqual([{ open: "14:00", close: "17:00" }]);
  });

  it("wraps a day range across the week boundary (e.g. Wed-Mon)", () => {
    const parsed = parseHours("Wed-Mon 10:00-18:00");
    for (const day of ["wed", "thu", "fri", "sat", "sun", "mon"] as const) {
      expect(parsed![day]).toEqual([{ open: "10:00", close: "18:00" }]);
    }
    expect(parsed!.tue).toBeUndefined();
  });

  it("handles a comma-separated day list mixed with a day range", () => {
    const parsed = parseHours("Tues, Thurs-Sun 10:00-18:00");
    expect(parsed!.tue).toEqual([{ open: "10:00", close: "18:00" }]);
    expect(parsed!.thu).toEqual([{ open: "10:00", close: "18:00" }]);
    expect(parsed!.fri).toEqual([{ open: "10:00", close: "18:00" }]);
    expect(parsed!.sat).toEqual([{ open: "10:00", close: "18:00" }]);
    expect(parsed!.sun).toEqual([{ open: "10:00", close: "18:00" }]);
    expect(parsed!.wed).toBeUndefined();
  });

  it("parses am/pm times", () => {
    const parsed = parseHours("9am-12:30pm");
    expect(parsed!.mon).toEqual([{ open: "09:00", close: "12:30" }]);
  });

  it("parses overnight ranges (close time earlier than open time)", () => {
    const parsed = parseHours("8:00-01:00");
    expect(parsed!.mon).toEqual([{ open: "08:00", close: "01:00" }]);
  });

  it("falls back to null for genuinely unparseable free text, never guesses", () => {
    expect(parseHours("Evenings")).toBeNull();
    expect(parseHours("Morning only")).toBeNull();
  });
});

describe("checkHoursConflict", () => {
  it("returns null when there's nothing to check against (no parsed hours or no day key)", () => {
    expect(checkHoursConflict(null, "mon", "09:00")).toBeNull();
    expect(checkHoursConflict(parseHours("9:00-19:00"), null, "09:00")).toBeNull();
  });

  it("returns null when the day isn't represented in the parsed hours (can't confirm, don't warn)", () => {
    const parsed = parseHours("Wed-Mon 10:00-18:00"); // no Tuesday
    expect(checkHoursConflict(parsed, "tue", "12:00")).toBeNull();
  });

  it("flags a time before opening", () => {
    const parsed = parseHours("9:00-19:00");
    expect(checkHoursConflict(parsed, "mon", "08:30")).toMatch(/outside typical hours/);
  });

  it("flags a time between split lunch/dinner service", () => {
    const parsed = parseHours("Mon-Sat 12:30-14:30, 19:30-22:30");
    expect(checkHoursConflict(parsed, "mon", "16:00")).toMatch(/outside typical hours/);
    expect(checkHoursConflict(parsed, "mon", "13:00")).toBeNull();
  });

  it("handles overnight wraps correctly (open before midnight, close after)", () => {
    const parsed = parseHours("8:00-01:00");
    expect(checkHoursConflict(parsed, "mon", "15:00")).toBeNull(); // mid-afternoon, open
    expect(checkHoursConflict(parsed, "mon", "00:30")).toBeNull(); // past midnight, still open
    expect(checkHoursConflict(parsed, "mon", "05:00")).toMatch(/outside typical hours/); // before opening
  });
});

describe("dayKeyForDate", () => {
  it("maps an ISO date + offset to the correct weekday", () => {
    // 2026-08-17 is a Monday.
    expect(dayKeyForDate("2026-08-17", 0)).toBe("mon");
    expect(dayKeyForDate("2026-08-17", 1)).toBe("tue");
    expect(dayKeyForDate("2026-08-17", 6)).toBe("sun");
  });

  it("returns null for an invalid date", () => {
    expect(dayKeyForDate("not-a-date", 0)).toBeNull();
  });
});

describe("addMinutesToTime", () => {
  it("adds minutes within the same day", () => {
    expect(addMinutesToTime("10:00", 90)).toBe("11:30");
  });

  it("clamps to the 06:00-23:45 range instead of wrapping past midnight", () => {
    expect(addMinutesToTime("23:30", 120)).toBe("23:45");
    expect(addMinutesToTime("05:00", -120)).toBe("06:00");
  });
});
