"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface SortableItem {
  id: string | number;
  [key: string]: unknown;
}

interface SortableListProps<T extends SortableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderOverlay?: (item: T) => React.ReactNode;
  direction?: "vertical" | "horizontal";
  className?: string;
  disabled?: boolean;
}

interface SortableItemWrapperProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  showHandle?: boolean;
}

// Sortable Item Wrapper
export function SortableItemWrapper({
  id,
  children,
  className,
  disabled = false,
  showHandle = true,
}: SortableItemWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "opacity-50 z-50",
        className
      )}
      {...attributes}
    >
      <div className="flex items-center gap-2">
        {showHandle && !disabled && (
          <button
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// Main Sortable List
export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  renderOverlay,
  direction = "vertical",
  className,
  disabled = false,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeItem = React.useMemo(
    () => items.find((item) => item.id === activeId),
    [activeId, items]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (disabled) {
    return (
      <div
        className={cn(
          direction === "vertical" ? "space-y-2" : "flex gap-2",
          className
        )}
      >
        {items.map((item, index) => (
          <div key={item.id}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={
          direction === "vertical"
            ? verticalListSortingStrategy
            : horizontalListSortingStrategy
        }
      >
        <div
          className={cn(
            direction === "vertical" ? "space-y-2" : "flex gap-2",
            className
          )}
        >
          {items.map((item, index) => (
            <SortableItemWrapper key={item.id} id={item.id}>
              {renderItem(item, index)}
            </SortableItemWrapper>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && renderOverlay ? (
          <div className="shadow-lg rounded-lg bg-background border">
            {renderOverlay(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Utility hook for managing sortable state
export function useSortableList<T extends SortableItem>(
  initialItems: T[],
  onOrderChange?: (items: T[]) => void
) {
  const [items, setItems] = React.useState(initialItems);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const reorder = React.useCallback(
    (newItems: T[]) => {
      setItems(newItems);
      onOrderChange?.(newItems);
    },
    [onOrderChange]
  );

  const addItem = React.useCallback((item: T, index?: number) => {
    setItems((prev) => {
      if (index !== undefined) {
        const newItems = [...prev];
        newItems.splice(index, 0, item);
        return newItems;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = React.useCallback((id: string | number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = React.useCallback((id: string | number, updates: Partial<T>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  return {
    items,
    reorder,
    addItem,
    removeItem,
    updateItem,
  };
}
