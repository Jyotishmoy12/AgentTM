import { useEffect, useRef } from 'react';

export function WorkspaceDivider({ side }: { side: 'history' | 'details' }) {
  const node = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; width: number; host: HTMLElement } | null>(null);
  const frame = useRef(0);
  const variable = side === 'history' ? '--history-width' : '--details-width';
  const minimum = side === 'history' ? 190 : 220;
  const maximumFor = (host: HTMLElement) => {
    const styles = getComputedStyle(host);
    const otherPanel =
      side === 'history'
        ? host.classList.contains('compact-workbench') || host.classList.contains('details-hidden')
          ? 0
          : parseFloat(styles.getPropertyValue('--details-width')) + 5
        : host.classList.contains('history-hidden')
          ? 0
          : parseFloat(styles.getPropertyValue('--history-width')) + 5;
    return Math.max(minimum, Math.min(420, host.clientWidth - otherPanel - 385));
  };
  const update = (value: number) => {
    const host = node.current?.closest<HTMLElement>('.history-workbench');
    if (!host) return;
    const maximum = maximumFor(host);
    const width = Math.round(Math.max(minimum, Math.min(maximum, value)));
    host.style.setProperty(variable, width + 'px');
    node.current?.setAttribute('aria-valuenow', String(width));
  };
  useEffect(() => {
    const host = node.current?.closest<HTMLElement>('.history-workbench');
    if (!host) return;
    const sync = () => {
      node.current?.setAttribute(
        'aria-valuenow',
        String(parseFloat(getComputedStyle(host).getPropertyValue(variable))),
      );
      node.current?.setAttribute('aria-valuemax', String(maximumFor(host)));
    };
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    const inspector = host.querySelector('.workbench-inspection');
    if (inspector) observer.observe(inspector);
    sync();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [variable, minimum]);
  return (
    <div
      ref={node}
      role="separator"
      tabIndex={0}
      aria-label={side === 'history' ? 'Resize history panel' : 'Resize details panel'}
      aria-orientation="vertical"
      aria-valuemin={minimum}
      aria-valuemax={420}
      aria-valuenow={side === 'history' ? 245 : 260}
      className={'workbench-divider divider-' + side}
      onPointerDown={(event) => {
        const host = event.currentTarget.closest<HTMLElement>('.history-workbench');
        if (!host) return;
        const width = parseFloat(getComputedStyle(host).getPropertyValue(variable));
        drag.current = { x: event.clientX, width, host };
        event.currentTarget.setPointerCapture(event.pointerId);
        host.classList.add('panel-resizing');
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current) return;
        const value = current.width + (event.clientX - current.x) * (side === 'history' ? 1 : -1);
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => update(value));
      }}
      onPointerUp={() => {
        drag.current?.host.classList.remove('panel-resizing');
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current?.host.classList.remove('panel-resizing');
        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const host = node.current?.closest<HTMLElement>('.history-workbench');
        if (!host) return;
        const width = parseFloat(getComputedStyle(host).getPropertyValue(variable));
        update(
          event.key === 'Home'
            ? minimum
            : event.key === 'End'
              ? 420
              : width + (event.key === 'ArrowRight' ? 16 : -16) * (side === 'history' ? 1 : -1),
        );
      }}
    >
      <span />
    </div>
  );
}
