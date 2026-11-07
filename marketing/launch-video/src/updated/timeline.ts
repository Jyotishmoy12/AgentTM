import capture from '../../public/updated/capture.json';
import { FPS } from './theme';

export type Screen = keyof typeof capture.shots;
export type Point = { x: number; y: number };
export const frameAt = (seconds: number) => Math.round(seconds * FPS);
function target(screen: Screen, name: string): Point {
  const targets = capture.shots[screen].targets as Record<string, Point>;
  return targets[name];
}
export const SCREENS: { name: Screen; at: number; title: string; step: string }[] = [
  { name: 'overview', at: 2.8, title: 'Your work. With a history.', step: '01 / 06' },
  { name: 'history', at: 6.5, title: 'Follow the recorded run.', step: '02 / 06' },
  { name: 'checkpoints', at: 10.3, title: 'Find a captured workspace.', step: '02 / 06' },
  { name: 'files', at: 13.2, title: 'Inspect the code at that moment.', step: '03 / 06' },
  { name: 'changes', at: 16.8, title: 'See what changed.', step: '04 / 06' },
  { name: 'split', at: 20.6, title: 'Compare captured states.', step: '04 / 06' },
  { name: 'restore', at: 24.5, title: 'Restore into a separate worktree.', step: '05 / 06' },
  { name: 'restored', at: 29, title: 'Captured files. Verified.', step: '05 / 06' },
  {
    name: 'workspaces',
    at: 31.5,
    title: 'Your original workspace stays in place.',
    step: '06 / 06',
  },
];
export const CLICKS = [
  { at: 6.35, point: target('overview', 'history') },
  { at: 10.15, point: target('history', 'filter') },
  { at: 13.05, point: target('checkpoints', 'inspect') },
  { at: 16.65, point: target('files', 'changes') },
  { at: 20.45, point: target('changes', 'split') },
  { at: 24.35, point: target('split', 'restore') },
  { at: 28.85, point: target('restore', 'confirm') },
  { at: 31.35, point: target('restored', 'view') },
];
export const CURSOR = [
  { at: 3.3, x: 1130, y: 605 },
  { at: 4.6, x: 1130, y: 605 },
  ...CLICKS.flatMap(({ at, point }, index) => [
    { at: at - (index === 0 ? 0.3 : 1.45), ...point },
    { at: at + 0.4, ...point },
  ]),
  { at: 33, ...target('workspaces', 'row') },
  { at: 35.6, ...target('workspaces', 'row') },
].sort((a, b) => a.at - b.at);
export const CAMERA = [
  { at: 2.8, zoom: 1, x: 800, y: 400 },
  { at: 4.9, zoom: 1, x: 800, y: 400 },
  { at: 6.35, zoom: 1.16, x: 480, y: 350 },
  { at: 7.3, zoom: 1.03, x: 800, y: 400 },
  { at: 9.5, zoom: 1.25, x: 900, y: 440 },
  { at: 10.3, zoom: 1.15, x: 760, y: 450 },
  { at: 11.3, zoom: 1.1, x: 1000, y: 400 },
  { at: 13.05, zoom: 1.22, x: 1170, y: 470 },
  { at: 14, zoom: 1.12, x: 1000, y: 400 },
  { at: 15, zoom: 1.33, x: 1050, y: 420 },
  { at: 16.65, zoom: 1.12, x: 650, y: 300 },
  { at: 17.6, zoom: 1.3, x: 1050, y: 440 },
  { at: 19.5, zoom: 1.32, x: 1050, y: 440 },
  { at: 20.45, zoom: 1.1, x: 750, y: 330 },
  { at: 21.4, zoom: 1.05, x: 800, y: 400 },
  { at: 22.8, zoom: 1.25, x: 1050, y: 330 },
  { at: 24.35, zoom: 1.1, x: 1150, y: 250 },
  { at: 25.5, zoom: 1.15, x: 800, y: 400 },
  { at: 27, zoom: 1.25, x: 800, y: 440 },
  { at: 28.85, zoom: 1.2, x: 850, y: 460 },
  { at: 29.8, zoom: 1.15, x: 800, y: 400 },
  { at: 31.35, zoom: 1.15, x: 850, y: 430 },
  { at: 32.4, zoom: 1.02, x: 800, y: 400 },
  { at: 34.4, zoom: 1.13, x: 1040, y: 350 },
  { at: 36.5, zoom: 1.05, x: 900, y: 400 },
];
