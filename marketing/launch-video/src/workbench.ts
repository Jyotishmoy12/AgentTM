import { Film, Intro, Record, Inspect, Restore, Outro, SHOTS, SFX, TOTAL } from './Film';

const components = { intro: Intro, record: Record, inspect: Inspect, restore: Restore, outro: Outro };
export const WORKBENCH = {
  name: 'AgentTM · Record. Inspect. Restore.',
  fps: 30, width: 1920, height: 1080, total: TOTAL, background: '#0b0e14',
  shots: SHOTS.map(shot => ({ ...shot, label: shot.id, component: components[shot.id] })),
  sfx: SFX.map(cue => ({ from: cue.from, duration: cue.duration, src: `audio/sfx/${cue.file}`, volume: cue.volume })),
  bgm: [{ from: 0, duration: TOTAL, src: 'audio/music/promo-bed.wav', volume: 1 }], original: Film,
};
