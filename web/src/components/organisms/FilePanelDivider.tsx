import { useEffect, useRef } from 'react';

export function FilePanelDivider() {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const node = useRef<HTMLDivElement>(null);
  const maximum = (host: HTMLElement) =>
    Math.max(
      120,
      Math.floor(
        Math.min(
          360,
          host.clientWidth - 270,
          host.clientWidth * (matchMedia('(min-width:1000px)').matches ? 0.3 : 0.35),
        ),
      ),
    );
  useEffect(() => {
    const host = node.current?.closest<HTMLElement>('.file-layout');
    const tree = host?.querySelector<HTMLElement>('.file-tree');
    if (!host || !tree) return;
    const sync = () => {
      node.current?.setAttribute('aria-valuemax', String(maximum(host)));
      node.current?.setAttribute(
        'aria-valuenow',
        String(Math.round(tree.getBoundingClientRect().width)),
      );
    };
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    observer.observe(tree);
    sync();
    return () => observer.disconnect();
  }, []);
  const resize = (value: number) => {
    const host = node.current?.closest<HTMLElement>('.file-layout');
    if (!host) return;
    const width = Math.round(Math.max(120, Math.min(value, maximum(host))));
    host.style.setProperty('--file-panel-width', width + 'px');
    node.current?.setAttribute('aria-valuenow', String(width));
  };
  return (
    <div
      ref={node}
      className="file-panel-divider"
      role="separator"
      aria-label="Resize file panel"
      aria-orientation="vertical"
      aria-valuemin={120}
      aria-valuemax={360}
      aria-valuenow={200}
      tabIndex={0}
      onPointerDown={(e) => {
        const host = e.currentTarget.closest('.file-layout')!;
        drag.current = {
          x: e.clientX,
          width: host.querySelector('.file-tree')!.getBoundingClientRect().width,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) resize(drag.current.width + e.clientX - drag.current.x);
      }}
      onPointerUp={() => (drag.current = null)}
      onLostPointerCapture={() => (drag.current = null)}
      onKeyDown={(e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const width = e.currentTarget.previousElementSibling!.getBoundingClientRect().width;
        resize(
          e.key === 'Home'
            ? 120
            : e.key === 'End'
              ? 360
              : width + (e.key === 'ArrowRight' ? 16 : -16),
        );
      }}
    />
  );
}
