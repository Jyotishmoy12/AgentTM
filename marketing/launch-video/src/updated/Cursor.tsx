import { useCurrentFrame } from 'remotion';
import { CLICKS, frameAt } from './timeline';
import { camera, cursor, tween } from './motion';
import { COLORS, STAGE } from './theme';

export function Cursor() {
  const frame = useCurrentFrame();
  const view = camera(frame),
    point = cursor(frame);
  const x = view.x + point.x * STAGE.scale * view.zoom;
  const y = view.y + point.y * STAGE.scale * view.zoom;
  const click = CLICKS.find((cue) => frame >= frameAt(cue.at) && frame < frameAt(cue.at) + 30);
  const age = click ? frame - frameAt(click.at) : 0;
  const press = click ? tween(age, 0, 5, 1, 0.86) + tween(age, 5, 13, 0, 0.14) : 1;
  const opacity =
    tween(frame, frameAt(3.35), frameAt(3.65)) * (1 - tween(frame, frameAt(35.5), frameAt(36)));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity }}>
      {click && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 44,
            height: 44,
            marginLeft: -22,
            marginTop: -22,
            border: `2px solid ${COLORS.green}`,
            borderRadius: '50%',
            opacity: 0.6 * (1 - tween(age, 0, 30)),
            transform: `scale(${tween(age, 0, 30, 0.25, 1.6)})`,
          }}
        />
      )}
      <svg
        width="36"
        height="45"
        viewBox="0 0 36 45"
        style={{
          position: 'absolute',
          left: x - 2,
          top: y - 1,
          transform: `scale(${press})`,
          transformOrigin: '2px 1px',
          filter: 'drop-shadow(0 3px 5px #000b)',
        }}
      >
        <path
          d="M3 2v31l8-8 7 15 6-3-7-14h13L3 2Z"
          fill="#f1f7f2"
          stroke="#173721"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
