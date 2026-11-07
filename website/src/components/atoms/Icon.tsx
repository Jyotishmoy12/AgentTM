import type * as React from 'react';
import type { IconName } from '../../types/App';

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    github: (
      <>
        <path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1-.4-2-1-2 4 0 7-2 7-6 0-2-.7-3-2-4 .2-1 .2-2-.2-3 0 0-2-.1-4 2-2-.5-4-.5-6 0-2-2-4-2-4-2-.5 1-.5 2-.2 3C3 7 3 8 3 10c0 4 3 6 7 6-.6.5-1 1-1 2v4" />
      </>
    ),
    play: <path d="m9 5 11 7-11 7z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    timeline: (
      <>
        <path d="M8 5h13M8 12h13M8 19h13" />
        <circle cx="3" cy="5" r="1" />
        <circle cx="3" cy="12" r="1" />
        <circle cx="3" cy="19" r="1" />
      </>
    ),
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />,
    branch: (
      <>
        <circle cx="6" cy="4" r="2" />
        <circle cx="18" cy="5" r="2" />
        <circle cx="6" cy="20" r="2" />
        <path d="M6 6v12M18 7v2c0 5-12 3-12 8" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="12" rx="3" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
      </>
    ),
    chat: (
      <>
        <path d="M21 3H3v15h5v4l5-4h8zM7 8h10M7 12h6" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 9 4v6c0 5-5 9-9 10-4-1-9-5-9-10V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    layers: (
      <>
        <path d="m12 2 10 6-10 6L2 8zm-10 11 10 6 10-6M2 18l10 6 10-6" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    terminal: <path d="m4 5 6 6-6 6m9 1h7" />,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
