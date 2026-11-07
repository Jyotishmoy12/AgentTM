import type { KeyboardEvent } from 'react';

export function moveTab(
  event: KeyboardEvent,
  current: number,
  count: number,
  select: (value: number) => void,
) {
  let next: number;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % count;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
    next = (current + count - 1) % count;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = count - 1;
  else return;
  event.preventDefault();
  select(next);
  const buttons =
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons?.[next]?.focus();
}
