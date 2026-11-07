export function PanelIcon({ type }: { type: 'history' | 'details' | 'focus' }) {
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
      {type === 'history' ? (
        <>
          <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01" />
        </>
      ) : type === 'details' ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M15 4v16M18 8h.01M18 12h.01" />
        </>
      ) : (
        <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
      )}
    </svg>
  );
}
