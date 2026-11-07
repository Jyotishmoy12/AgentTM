import { Img, staticFile, useCurrentFrame } from 'remotion';
import { Brand } from './Brand';
import { Cursor } from './Cursor';
import { camera, tween } from './motion';
import { COLORS, STAGE } from './theme';
import { frameAt, SCREENS } from './timeline';

export function ProductStage() {
  const frame = useCurrentFrame();
  const current = SCREENS.filter((shot) => frame >= frameAt(shot.at)).at(-1) || SCREENS[0];
  const view = camera(frame);
  const opacity =
    tween(frame, frameAt(2.8), frameAt(3.55)) * (1 - tween(frame, frameAt(35.8), frameAt(36.6)));
  return (
    <div style={{ opacity }}>
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Brand />
        <div
          style={{
            position: 'absolute',
            left: 270,
            right: 270,
            height: 48,
            textAlign: 'center',
            fontSize: 36,
            fontWeight: 550,
            letterSpacing: -0.9,
          }}
        >
          {SCREENS.map((shot, index) => {
            const start = frameAt(shot.at),
              next = SCREENS[index + 1];
            const end = next ? frameAt(next.at) : 2400;
            if (frame < start || frame > end + 20) return null;
            const appear = tween(frame, start, start + 20);
            const leave = tween(frame, end, end + 20);
            return (
              <div
                key={shot.name}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: appear * (1 - leave),
                  transform: `translateY(${(1 - appear) * 8 - leave * 8}px)`,
                }}
              >
                {shot.title}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 19, color: COLORS.green, letterSpacing: 2 }}>{current.step}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 112,
          left: 80,
          width: 1760,
          height: 1,
          background: '#ffffff0c',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, ((frame - frameAt(2.8)) / frameAt(33)) * 100))}%`,
            height: 1,
            background: '#8acb9c90',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: STAGE.x,
          top: STAGE.y,
          width: STAGE.width,
          height: STAGE.height,
          overflow: 'hidden',
          borderRadius: 18,
          background: COLORS.surface,
          outline: `1px solid ${COLORS.line}`,
          boxShadow: '0 28px 70px #0006',
          transform: `translateY(${tween(frame, frameAt(2.8), frameAt(3.7), 32, 0)}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1760,
            height: 880,
            transformOrigin: '0 0',
            transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})`,
          }}
        >
          {SCREENS.map((shot, index) => {
            const next = SCREENS[index + 1];
            const from = frameAt(shot.at),
              until = next ? frameAt(next.at) + 20 : 2400;
            if (frame < from || frame >= until) return null;
            return (
              <Img
                key={shot.name}
                src={staticFile(`updated/${shot.name}.png`)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: 1760,
                  height: 880,
                  opacity: index === 0 ? 1 : tween(frame, from, from + 18),
                }}
              />
            );
          })}
        </div>
        <Cursor />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 1046,
          display: 'flex',
          justifyContent: 'space-between',
          color: COLORS.muted,
          fontSize: 16,
          letterSpacing: 0.25,
        }}
      >
        <span>REAL RECORDED DEMO · EDITED TOUR</span>
        <span>Workspace observations, not atomic snapshots.</span>
      </div>
    </div>
  );
}
