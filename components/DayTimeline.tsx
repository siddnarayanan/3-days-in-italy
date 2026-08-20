import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { resolveReorderIndices } from "@/lib/reorder";
import type { ItineraryDay } from "@/lib/types";
import SortableStop from "./SortableStop";
import TravelConnector from "./TravelConnector";

interface Props {
  day: ItineraryDay;
  onRemoveStop: (placeId: string) => void;
  onAddStop: () => void;
  onSwapStop: (placeId: string) => void;
  onReorderStops: (oldIndex: number, newIndex: number) => void;
  // placeId -> number matching that stop's pin on the map (see ItineraryView).
  stopNumbers: Map<string, number>;
}

export default function DayTimeline({ day, onRemoveStop, onAddStop, onSwapStop, onReorderStops, stopNumbers }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const resolved = resolveReorderIndices(
      day.stops.map((s) => s.placeId),
      String(active.id),
      over ? String(over.id) : null
    );
    if (resolved) onReorderStops(resolved.oldIndex, resolved.newIndex);
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
            {day.stops.map((stop, i) => (
              <div key={stop.placeId} className="flex flex-col gap-3">
                <SortableStop
                  stop={stop}
                  onRemove={() => onRemoveStop(stop.placeId)}
                  onSwap={() => onSwapStop(stop.placeId)}
                  number={stopNumbers.get(stop.placeId)}
                />
                {i < day.stops.length - 1 && <TravelConnector from={stop} to={day.stops[i + 1]} />}
              </div>
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
