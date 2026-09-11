"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type ReorderItem = { id: string; label: string };

type Options = {
  items: ReorderItem[];
  onReorder: (from: number, to: number) => void;
  /** Fires on a short press that did not become a drag. */
  onTap?: (index: number) => void;
  /** CSS selectors used to measure ghost width / left (first match wins). */
  widthSelectors?: string[];
  itemAttr?: string;
  pressMs?: number;
  bodyClass?: string;
  ghostBadge?: string;
};

/**
 * Long-press anywhere on a row, then drag to reorder.
 * Short press (tap) calls onTap when provided.
 * Renders a full-width floating ghost via portal.
 */
export function useLongPressReorder({
  items,
  onReorder,
  onTap,
  widthSelectors = [".kit-tabs", ".q-list"],
  itemAttr = "data-q-index",
  pressMs = 320,
  bodyClass = "is-q-dragging",
  ghostBadge = "Moving",
}: Options) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragLabel, setDragLabel] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragActiveRef = useRef(false);
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const pointerXRef = useRef(0);
  const pointerYRef = useRef(0);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghostWidthRef = useRef<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current != null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const setDragOver = useCallback((index: number) => {
    if (dragOverRef.current === index) return;
    dragOverRef.current = index;
    setDragOverIdx(index);
  }, []);

  const hitTestIndex = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      const card = el?.closest?.(`[${itemAttr}]`) as HTMLElement | null;
      if (!card) return;
      const idx = Number(card.getAttribute(itemAttr));
      if (!Number.isNaN(idx)) setDragOver(idx);
    },
    [itemAttr, setDragOver]
  );

  const placeGhost = useCallback((x: number, y: number) => {
    const node = ghostRef.current;
    if (!node) return;
    if (ghostWidthRef.current) node.style.width = `${ghostWidthRef.current}px`;
    const offsetY = 12;
    const width = node.offsetWidth || ghostWidthRef.current || 0;
    const cardLeft = Number(node.dataset.cardLeft || 0);
    const left =
      cardLeft || Math.max(8, Math.min(x - width / 2, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(y + offsetY, window.innerHeight - node.offsetHeight - 8));
    node.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }, []);

  const tickAutoScroll = useCallback(() => {
    if (!dragActiveRef.current) {
      stopAutoScroll();
      return;
    }
    const y = pointerYRef.current;
    const edge = 72;
    const max = 18;
    let delta = 0;
    if (y < edge) delta = -Math.ceil(((edge - y) / edge) * max);
    else if (y > window.innerHeight - edge) {
      delta = Math.ceil(((y - (window.innerHeight - edge)) / edge) * max);
    }
    if (delta !== 0) {
      window.scrollBy(0, delta);
      hitTestIndex(
        Math.min(window.innerWidth - 8, Math.max(8, window.innerWidth / 2)),
        Math.min(window.innerHeight - 8, Math.max(8, y))
      );
    }
    autoScrollRef.current = requestAnimationFrame(tickAutoScroll);
  }, [hitTestIndex, stopAutoScroll]);

  const finish = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    stopAutoScroll();
    const from = dragFromRef.current;
    const to = dragOverRef.current;
    if (dragActiveRef.current && from != null && to != null) {
      onReorderRef.current(from, to);
    }
    dragActiveRef.current = false;
    dragFromRef.current = null;
    dragOverRef.current = null;
    setDragFrom(null);
    setDragOverIdx(null);
    setDragActive(false);
    setDragLabel("");
    ghostWidthRef.current = null;
    document.body.classList.remove(bodyClass);
  }, [bodyClass, stopAutoScroll]);

  const begin = useCallback(
    (index: number) => {
      const item = itemsRef.current[index];
      if (!item) return;
      const source = document.querySelector(`[${itemAttr}="${index}"]`) as HTMLElement | null;
      let widthSource: HTMLElement | null = null;
      for (const sel of widthSelectors) {
        widthSource = document.querySelector(sel) as HTMLElement | null;
        if (widthSource) break;
      }
      widthSource = widthSource || source;
      const widthRect = widthSource?.getBoundingClientRect();
      const cardRect = source?.getBoundingClientRect();
      ghostWidthRef.current = widthRect ? Math.round(widthRect.width) : null;
      const left = widthRect
        ? Math.round(widthRect.left)
        : cardRect
          ? Math.round(cardRect.left)
          : 8;

      dragActiveRef.current = true;
      dragFromRef.current = index;
      dragOverRef.current = index;
      setDragFrom(index);
      setDragOverIdx(index);
      setDragLabel(item.label);
      setDragActive(true);
      document.body.classList.add(bodyClass);

      requestAnimationFrame(() => {
        if (ghostRef.current) {
          ghostRef.current.dataset.cardLeft = String(left);
          if (ghostWidthRef.current) {
            ghostRef.current.style.width = `${ghostWidthRef.current}px`;
          }
        }
        placeGhost(pointerXRef.current, pointerYRef.current);
      });
      stopAutoScroll();
      autoScrollRef.current = requestAnimationFrame(tickAutoScroll);
    },
    [bodyClass, itemAttr, placeGhost, stopAutoScroll, tickAutoScroll, widthSelectors]
  );

  const onMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragActiveRef.current) return;
      pointerXRef.current = clientX;
      pointerYRef.current = clientY;
      placeGhost(clientX, clientY);
      hitTestIndex(clientX, clientY);
    },
    [hitTestIndex, placeGhost]
  );

  useEffect(() => {
    if (dragFrom == null) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      onMove(e.clientX, e.clientY);
    };
    const up = () => finish();
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragFrom, finish, onMove]);

  useEffect(() => {
    if (!dragActive) return;
    placeGhost(pointerXRef.current, pointerYRef.current);
  }, [dragActive, dragLabel, placeGhost]);

  function bindItem(index: number) {
    return {
      [itemAttr]: index,
      onPointerDown: (e: ReactPointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest(".q-card-actions, button, a, input, textarea, select")) return;
        pointerXRef.current = e.clientX;
        pointerYRef.current = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
        pressTimerRef.current = setTimeout(() => begin(index), pressMs);
      },
      onPointerMove: (e: ReactPointerEvent) => {
        pointerXRef.current = e.clientX;
        pointerYRef.current = e.clientY;
        if (dragActiveRef.current) {
          onMove(e.clientX, e.clientY);
          return;
        }
        if (pressTimerRef.current && (Math.abs(e.movementX) > 8 || Math.abs(e.movementY) > 8)) {
          clearTimeout(pressTimerRef.current);
          pressTimerRef.current = null;
        }
      },
      onPointerUp: () => {
        if (dragActiveRef.current) {
          finish();
          return;
        }
        const wasPendingPress = pressTimerRef.current != null;
        if (pressTimerRef.current) {
          clearTimeout(pressTimerRef.current);
          pressTimerRef.current = null;
        }
        if (wasPendingPress) onTapRef.current?.(index);
      },
      onPointerCancel: () => finish(),
    };
  }

  const ghost =
    dragActive && typeof document !== "undefined"
      ? createPortal(
          <div ref={ghostRef} className="q-drag-ghost" aria-hidden>
            <span className="q-drag-ghost-badge">{ghostBadge}</span>
            <p>{dragLabel}</p>
          </div>,
          document.body
        )
      : null;

  return {
    dragFrom,
    dragOverIdx,
    dragActive,
    isReordering: dragFrom != null,
    bindItem,
    ghost,
    ghostRef: ghostRef as RefObject<HTMLDivElement | null>,
  };
}
