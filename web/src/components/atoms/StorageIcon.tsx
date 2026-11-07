import type { Flow } from '../../types/StorageManager';

export function StorageIcon({ kind }: { kind: Flow | 'storage' }) {
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
      {kind === 'storage' ? (
        <>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
        </>
      ) : kind === 'backup' ? (
        <>
          <path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" />
          <path d="M5 6V3h3" />
        </>
      ) : kind === 'restore' ? (
        <>
          <path d="M12 16V4m-4 4 4-4 4 4M4 15v6h16v-6" />
        </>
      ) : (
        <>
          <path d="m14 4 6 6M3 21l3-9 9-9 6 6-9 9-9 3ZM6 12l6 6M13 17l3 3M17 13l4 3" />
        </>
      )}
    </svg>
  );
}
