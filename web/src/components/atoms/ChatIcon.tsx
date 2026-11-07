export function ChatIcon({
  name,
}: {
  name: 'spark' | 'history' | 'plus' | 'arrow' | 'stop' | 'shield' | 'tool' | 'chevron' | 'layers';
}) {
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
      {name === 'spark' ? (
        <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />
      ) : name === 'history' ? (
        <>
          <path d="M4 5v5h5M4 10a8 8 0 1 1 1 8" />
          <path d="M12 7v5l3 2" />
        </>
      ) : name === 'plus' ? (
        <path d="M12 5v14M5 12h14" />
      ) : name === 'arrow' ? (
        <path d="M12 19V5m-6 6 6-6 6 6" />
      ) : name === 'stop' ? (
        <rect x="6" y="6" width="12" height="12" rx="1" />
      ) : name === 'shield' ? (
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      ) : name === 'tool' ? (
        <>
          <path d="m4 6 5 6-5 6M12 18h8" />
        </>
      ) : name === 'chevron' ? (
        <path d="m6 9 6 6 6-6" />
      ) : (
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
      )}
    </svg>
  );
}
