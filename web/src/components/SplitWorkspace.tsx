import { useRef, useState, type CSSProperties, type ReactNode } from "react";

export function SplitWorkspace({
  children,
}: {
  children: [ReactNode, ReactNode];
}) {
  const host = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(57);
  const [dragging, setDragging] = useState(false);
  const clamp = (value: number) => Math.min(70, Math.max(35, value));
  return (
    <div
      ref={host}
      className={`timeline-workspace ${dragging ? "is-resizing" : ""}`}
      style={
        {
          "--timeline-size": `${position}fr`,
          "--inspector-size": `${100 - position}fr`,
        } as CSSProperties
      }
    >
      {children[0]}
      <div
        className="workspace-divider"
        role="separator"
        tabIndex={0}
        aria-label="Resize timeline panel"
        aria-orientation="vertical"
        aria-valuemin={35}
        aria-valuemax={70}
        aria-valuenow={Math.round(position)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!dragging || !host.current) return;
          const box = host.current.getBoundingClientRect();
          setPosition(clamp(((event.clientX - box.left) / box.width) * 100));
        }}
        onPointerUp={() => setDragging(false)}
        onLostPointerCapture={() => setDragging(false)}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setPosition((value) =>
              event.key === "Home"
                ? 35
                : event.key === "End"
                  ? 70
                  : clamp(value + (event.key === "ArrowLeft" ? -3 : 3)),
            );
          }
        }}
      >
        <span />
      </div>
      {children[1]}
    </div>
  );
}
