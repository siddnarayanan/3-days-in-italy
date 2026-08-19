"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ItineraryStop } from "@/lib/types";
import PlaceCard from "./PlaceCard";

interface Props {
  stop: ItineraryStop;
  onRemove: () => void;
  number?: number;
}

export default function SortableStop({ stop, onRemove, number }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.placeId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PlaceCard
        stop={stop}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        number={number}
      />
    </div>
  );
}
