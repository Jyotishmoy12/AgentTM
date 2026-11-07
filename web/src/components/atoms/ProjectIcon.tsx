export function ProjectIcon({ kind }: { kind: 'folder' | 'copy' | 'open' | 'close' | 'chevron' }) {
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
      {kind === 'folder' && <path d="M3 7V5h6l2 2h10v13H3V7Z" />}
      {kind === 'copy' && (
        <>
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8V3H3v13h5" />
        </>
      )}
      {kind === 'open' && (
        <>
          <rect x="3" y="6" width="14" height="15" rx="2" />
          <path d="M10 14 21 3M14 3h7v7" />
        </>
      )}
      {kind === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
      {kind === 'chevron' && <path d="m8 10 4 4 4-4" />}
    </svg>
  );
}
