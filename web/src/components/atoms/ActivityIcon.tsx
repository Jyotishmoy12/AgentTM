export function ActivityIcon({ kind }: { kind: string }) {
  return (
    <svg
      className="app-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'prompt' || kind === 'reply' ? (
        <>
          <path d="M4 4h16v12H9l-5 4V4Z" />
          {kind === 'reply' && <path d="M8 8h8M8 12h5" />}
        </>
      ) : kind === 'command' ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="m7 9 3 3-3 3M13 15h4" />
        </>
      ) : kind === 'capture' ? (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
        </>
      ) : kind === 'failure' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 17h.01" />
        </>
      ) : kind === 'file' ? (
        <>
          <path d="M6 3h8l4 4v14H6V3ZM14 3v5h4M9 12h6M9 16h4" />
        </>
      ) : kind === 'tool' ? (
        <>
          <path d="m7 5-4 7 4 7M17 5l4 7-4 7M14 4l-4 16" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </>
      )}
    </svg>
  );
}
