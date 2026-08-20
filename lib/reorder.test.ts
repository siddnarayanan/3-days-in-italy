import { resolveReorderIndices, reorderStopsKeepingTimes } from "./reorder";

describe("resolveReorderIndices", () => {
  const ids = ["a", "b", "c", "d"];

  it("resolves a valid drag into indices", () => {
    expect(resolveReorderIndices(ids, "a", "c")).toEqual({ oldIndex: 0, newIndex: 2 });
  });

  it("returns null when dropped on itself", () => {
    expect(resolveReorderIndices(ids, "b", "b")).toBeNull();
  });

  it("returns null when there's no drop target", () => {
    expect(resolveReorderIndices(ids, "b", null)).toBeNull();
    expect(resolveReorderIndices(ids, "b", undefined)).toBeNull();
  });

  it("returns null when either id isn't in the list", () => {
    expect(resolveReorderIndices(ids, "ghost", "b")).toBeNull();
    expect(resolveReorderIndices(ids, "a", "ghost")).toBeNull();
  });
});

describe("reorderStopsKeepingTimes", () => {
  it("moves the place but keeps each position's original time", () => {
    const stops = [
      { placeId: "p1", startTime: "09:00" },
      { placeId: "p2", startTime: "13:00" },
      { placeId: "p3", startTime: "16:00" },
    ];
    const result = reorderStopsKeepingTimes(stops, 0, 2);
    // p1 moves to the last position, p2/p3 shift up — but times stay 09:00/13:00/16:00 in order.
    expect(result.map((s) => s.placeId)).toEqual(["p2", "p3", "p1"]);
    expect(result.map((s) => s.startTime)).toEqual(["09:00", "13:00", "16:00"]);
  });

  it("does not mutate the input array", () => {
    const stops = [
      { placeId: "p1", startTime: "09:00" },
      { placeId: "p2", startTime: "13:00" },
    ];
    const original = stops.map((s) => ({ ...s }));
    reorderStopsKeepingTimes(stops, 0, 1);
    expect(stops).toEqual(original);
  });

  it("is a no-op in effect when moving to the same index", () => {
    const stops = [
      { placeId: "p1", startTime: "09:00" },
      { placeId: "p2", startTime: "13:00" },
    ];
    const result = reorderStopsKeepingTimes(stops, 1, 1);
    expect(result).toEqual(stops);
  });
});
