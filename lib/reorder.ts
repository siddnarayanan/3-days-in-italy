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

export function reorderStopsKeepingTimes<T extends { startTime: string }>(
  stops: T[],
  oldIndex: number,
  newIndex: number
): T[] {
  const times = stops.map((s) => s.startTime);
  const reordered = arrayMove(stops, oldIndex, newIndex);
  return reordered.map((s, i) => ({ ...s, startTime: times[i] }));
}
