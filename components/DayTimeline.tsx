import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ItineraryDay } from "@/lib/types";
import SortableStop from "./SortableStop";

interface Props {
  day: ItineraryDay;
  onRemoveStop: (placeId: string) => void;
  onAddStop: () => void;
  onReorderStops: (oldIndex: number, newIndex: number) => void;
}

export default function DayTimeline({ day, onRemoveStop, onAddStop, onReorderStops }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = day.stops.findIndex((s) => s.placeId === active.id);
    const newIndex = day.stops.findIndex((s) => s.placeId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderStops(oldIndex, newIndex);
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-stone-900">
          Day {day.day}: {day.theme}
        </h2>
        <p className="mt-1 text-sm text-stone-600">{day.summary}</p>
        {day.warnings.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {day.warnings.map((w, i) => (
              <p key={i} className="text-xs font-medium text-red-700">
                ⚠ {w}
              </p>
            ))}
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={day.stops.map((s) => s.placeId)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {day.stops.map((stop) => (
              <SortableStop key={stop.placeId} stop={stop} onRemove={() => onRemoveStop(stop.placeId)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={onAddStop}
        className="mt-3 w-full rounded-xl border-2 border-dashed border-stone-300 py-3 text-sm font-medium text-stone-500 transition-colors hover:border-indigo-400 hover:text-indigo-700"
      >
        + Add a stop to this day
      </button>
    </div>
  );
}
