import { COLORS } from './theme';

export function Brand({ size = 38, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.27 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="1" y="1" width="38" height="38" rx="11" fill="#8acb9c0c" stroke="#8acb9c50" />
        <g
          transform="translate(6 6)"
          stroke={COLORS.green}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9a10 10 0 1 1-1 9M6 3v7H1M14 8v7l4 2" />
        </g>
      </svg>
      {wordmark && (
        <span style={{ fontSize: size * 0.8, fontWeight: 650, letterSpacing: -size * 0.035 }}>
          Agent<span style={{ color: COLORS.green }}>TM</span>
        </span>
      )}
    </div>
  );
}
