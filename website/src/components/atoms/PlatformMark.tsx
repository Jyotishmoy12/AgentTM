import type { Platform } from '../../content';

export function PlatformMark({ platform }: { platform: Platform }) {
  return (
    <svg className="platform-mark" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      {platform === 'windows' ? (
        <>
          <path d="M2 5 11 3.8v8H2zM13 3.5 23 2v9.8H13zM2 13h9v8L2 19.7zM13 13h10v10L13 21.5z" />
        </>
      ) : platform === 'macos' ? (
        <>
          <path d="M15.8 5.7c1-1.1 1.7-2.5 1.6-3.9-1.4.1-2.9.9-3.8 2-.8.9-1.5 2.3-1.4 3.7 1.4.1 2.8-.7 3.6-1.8ZM19 13c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8s-1.7-.8-2.8-.7c-1.4 0-2.8.8-3.5 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.4 2 2.5 1.9 1-.1 1.4-.6 2.7-.6s1.6.6 2.8.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.3Z" />
        </>
      ) : (
        <>
          <path
            d="M6 8 10 12 6 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 17h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="2"
            y="3"
            width="20"
            height="18"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </>
      )}
    </svg>
  );
}
