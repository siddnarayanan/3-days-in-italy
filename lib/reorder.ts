// Pulled out of the components so the actual reordering logic (index
// resolution from a drag event, and the "positions keep their time slots"
// rule) is testable without rendering anything or simulating a real drag —
// dnd-kit's pointer physics aren't practically unit-testable in jsdom, but
// this logic is what actually matters and it's plain data in, data out.

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Resolves a drag-end's active/over ids into array indices, or null if nothing should move. */
export function resolveReorderIndices(
  itemIds: string[],
  activeId: string,
  overId: string | null | undefined
): { oldIndex: number; newIndex: number } | null {
  if (overId == null || activeId === overId) return null;
  const oldIndex = itemIds.indexOf(activeId);
  const newIndex = itemIds.indexOf(overId);
  if (oldIndex === -1 || newIndex === -1) return null;
  return { oldIndex, newIndex };
}

/**
 * Reorders stops by position, but each position keeps its original time slot
 * — dragging a place to a new spot moves the place into that slot's time, not
 * the other way around. If that lands it somewhere its hours don't cover, the
 * guardrail layer (lib/validate.ts) catches it like any other conflict.
 */
export function reorderStopsKeepingTimes<T extends { startTime: string }>(
  stops: T[],
  oldIndex: number,
  newIndex: number
): T[] {
  const times = stops.map((s) => s.startTime);
  const reordered = arrayMove(stops, oldIndex, newIndex);
  return reordered.map((s, i) => ({ ...s, startTime: times[i] }));
}
