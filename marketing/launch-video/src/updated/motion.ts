import { Easing, interpolate } from 'remotion';
import { CAMERA, CURSOR } from './timeline';
import { FPS, STAGE } from './theme';

const ease = Easing.bezier(0.4, 0, 0.2, 1);
export function tween(frame: number, from: number, to: number, a = 0, b = 1) {
  return interpolate(frame, [from, to], [a, b], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
}
export function camera(frame: number) {
  const times = CAMERA.map((key) => key.at * FPS);
  const value = (key: 'zoom' | 'x' | 'y') =>
    interpolate(
      frame,
      times,
      CAMERA.map((v) => v[key]),
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: ease,
      },
    );
  const zoom = value('zoom');
  let x = Math.max(
    STAGE.width * (1 - zoom),
    Math.min(0, STAGE.width / 2 - value('x') * STAGE.scale * zoom),
  );
  let y = Math.max(
    STAGE.height * (1 - zoom),
    Math.min(0, STAGE.height / 2 - value('y') * STAGE.scale * zoom),
  );
  const pointer = cursor(frame);
  const px = pointer.x * STAGE.scale * zoom,
    py = pointer.y * STAGE.scale * zoom;
  x = Math.max(
    STAGE.width * (1 - zoom),
    Math.min(0, Math.max(54 - px, Math.min(STAGE.width - 54 - px, x))),
  );
  y = Math.max(
    STAGE.height * (1 - zoom),
    Math.min(0, Math.max(54 - py, Math.min(STAGE.height - 54 - py, y))),
  );
  return { zoom, x, y };
}
export function cursor(frame: number) {
  const time = frame / FPS;
  const next = CURSOR.findIndex((key) => key.at > time);
  if (next === 0) return CURSOR[0];
  if (next === -1) return CURSOR[CURSOR.length - 1];
  const a = CURSOR[next - 1],
    b = CURSOR[next];
  const progress = ease((time - a.at) / (b.at - a.at));
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const arc = Math.sin(progress * Math.PI) * Math.min(50, distance * 0.12);
  return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress - arc };
}
