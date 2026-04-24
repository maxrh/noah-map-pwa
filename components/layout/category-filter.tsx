"use client";

import { useMemo, useCallback, useState } from "react";
import { useSearch } from "@/lib/search-context";
import { CategoryBadge } from "@/components/ui/category-badge";
import { cn } from "@/lib/utils";

const DRAG_THRESHOLD = 5; // px before a press becomes a drag

function useDragScroll<T extends HTMLElement>() {
  const [isDragging, setIsDragging] = useState(false);

  const ref = useCallback((el: T | null) => {
    if (!el) return;

    let pointerDown = false;
    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      pointerDown = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScrollLeft = el!.scrollLeft;
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointerDown || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!moved) {
        moved = true;
        setIsDragging(true);
      }
      e.preventDefault();
      el!.scrollLeft = startScrollLeft - dx;
    }

    function endDrag(e: PointerEvent) {
      if (!pointerDown || e.pointerId !== pointerId) return;
      pointerDown = false;
      if (moved) {
        setTimeout(() => setIsDragging(false), 0);
      }
    }

    function onClickCapture(e: MouseEvent) {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
  }, []);

  return { ref, isDragging };
}

export function CategoryFilter() {
  const { groups, selectedCategory, setSelectedCategory } = useSearch();
  const { ref: scrollRef, isDragging } = useDragScroll<HTMLDivElement>();

  // Derive unique categories from groups that actually exist
  const categories = useMemo(() => {
    const seen = new Map<string, string>(); // name -> iconName
    for (const g of groups) {
      if (g.category && !seen.has(g.category)) {
        seen.set(g.category, g.categoryIcon);
      }
    }
    return Array.from(seen, ([name, icon]) => ({ name, icon }));
  }, [groups]);

  if (categories.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex gap-1 overflow-x-auto scrollbar-none px-4 select-none",
        isDragging
          ? "cursor-grabbing [&_*]:!cursor-grabbing"
          : "cursor-grab"
      )}
    >
      <button
        type="button"
        onClick={() => setSelectedCategory(null)}
        className="shrink-0"
      >
        <CategoryBadge
          category="Alle"
          className={cn(
            "cursor-pointer transition-opacity",
            selectedCategory !== null && "opacity-50"
          )}
        />
      </button>
      {categories.map((cat) => (
        <button
          key={cat.name}
          type="button"
          onClick={() =>
            setSelectedCategory(
              selectedCategory === cat.name ? null : cat.name
            )
          }
          className="shrink-0"
        >
          <CategoryBadge
            category={cat.name}
            iconName={cat.icon}
            className={cn(
              "cursor-pointer transition-opacity",
              selectedCategory !== null &&
                selectedCategory !== cat.name &&
                "opacity-50"
            )}
          />
        </button>
      ))}
    </div>
  );
}
