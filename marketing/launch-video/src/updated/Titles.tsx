import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Brand } from './Brand';
import { tween } from './motion';
import { COLORS } from './theme';
import { frameAt } from './timeline';

export function Opening() {
  const frame = useCurrentFrame();
  const opacity = tween(frame, 0, 26) * (1 - tween(frame, frameAt(2.7), frameAt(3.3)));
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity }}>
      <div style={{ position: 'absolute', top: 211 }}>
        <Brand size={76} />
      </div>
      <div
        style={{
          textAlign: 'center',
          marginTop: 40,
          transform: `translateY(${tween(frame, 8, 60, 22, 0)}px)`,
        }}
      >
        <div
          style={{ fontSize: 86, fontWeight: 550, letterSpacing: -4, opacity: tween(frame, 8, 48) }}
        >
          Your agent moved fast.
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 550,
            letterSpacing: -4.5,
            color: COLORS.green,
            marginTop: 10,
            opacity: tween(frame, 25, 72),
          }}
        >
          Know what happened.
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 27,
            color: COLORS.muted,
            opacity: tween(frame, 45, 90),
          }}
        >
          Workspace history for managed Codex runs.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 195,
          width: 240,
          height: 1,
          background: '#8acb9c44',
          transform: `scaleX(${tween(frame, 42, 100)})`,
        }}
      />
    </AbsoluteFill>
  );
}

export function Closing() {
  const frame = useCurrentFrame();
  const local = frame - frameAt(35.9);
  if (local < 0) return null;
  const enter = tween(local, 0, 48);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: enter }}>
      <div
        style={{
          transform: `translateY(${(1 - enter) * 18}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Brand size={118} />
        <div style={{ fontSize: 67, fontWeight: 500, letterSpacing: -2.3, marginTop: 30 }}>
          Record. Inspect. Restore.
        </div>
        <div style={{ marginTop: 25, color: COLORS.muted, fontSize: 26 }}>
          Windows desktop · Windows / macOS / Linux CLI
        </div>
        <div
          style={{
            marginTop: 48,
            padding: '16px 26px',
            border: '1px solid #8acb9c5c',
            borderRadius: 12,
            background: '#8acb9c0b',
            color: COLORS.green,
            fontSize: 35,
            letterSpacing: -0.4,
          }}
        >
          github.com/Jyotishmoy12/AgentTM ↗
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 60, color: COLORS.muted, fontSize: 20 }}>
        History stays on your device. Codex uses its configured service.
      </div>
    </AbsoluteFill>
  );
}
