import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

/** One keyboard and pointer tooltip for the collapsed sidebar's real buttons. */
export function SidebarTooltip() {
  const id = useId();
  const [hint, setHint] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  useEffect(() => {
    let anchor: HTMLElement | null = null;
    let previous: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function clear() {
      clearTimeout(timer);
      if (anchor) {
        if (previous) anchor.setAttribute("aria-describedby", previous);
        else anchor.removeAttribute("aria-describedby");
      }
      anchor = null;
      setHint(null);
    }
    function target(event: Event) {
      return event.target instanceof Element
        ? event.target.closest<HTMLElement>(
            ".sidebar-collapsed .app-sidebar button[data-sidebar-tooltip]",
          )
        : null;
    }
    function show(event: Event) {
      const button = target(event);
      if (!button) return;
      if (button === anchor) return;
      clear();
      anchor = button;
      previous = button.getAttribute("aria-describedby");
      const reveal = () => {
        if (!button.isConnected || !button.closest(".sidebar-collapsed"))
          return clear();
        const box = button.getBoundingClientRect();
        button.setAttribute(
          "aria-describedby",
          [previous, id].filter(Boolean).join(" "),
        );
        setHint({
          text: button.dataset.sidebarTooltip || "",
          x: box.right + 12,
          y: Math.max(24, Math.min(innerHeight - 24, box.top + box.height / 2)),
        });
      };
      if (event.type === "focusin") reveal();
      else timer = setTimeout(reveal, 300);
    }
    function leave(event: Event) {
      const related = (event as MouseEvent).relatedTarget;
      if (anchor && !(related instanceof Node && anchor.contains(related)))
        clear();
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") clear();
    }
    document.addEventListener("pointerover", show);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusin", show);
    document.addEventListener("focusout", leave);
    document.addEventListener("keydown", key);
    document.addEventListener("click", clear);
    window.addEventListener("resize", clear);
    window.addEventListener("scroll", clear, true);
    return () => {
      clear();
      document.removeEventListener("pointerover", show);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", show);
      document.removeEventListener("focusout", leave);
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", clear);
      window.removeEventListener("resize", clear);
      window.removeEventListener("scroll", clear, true);
    };
  }, [id]);
  return hint
    ? createPortal(
        <div
          id={id}
          role="tooltip"
          className="sidebar-hint"
          style={{ left: hint.x, top: hint.y }}
        >
          {hint.text}
        </div>,
        document.body,
      )
    : null;
}
