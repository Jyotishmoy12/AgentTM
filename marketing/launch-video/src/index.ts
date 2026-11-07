import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Film, TOTAL } from './Film';
import { UpdatedFilm } from './updated/Film';
import { TOTAL_FRAMES, FPS } from './updated/theme';

const Original = () =>
  React.createElement(Composition, {
    id: 'AgentTMLaunch',
    component: Film,
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: TOTAL,
    defaultProps: { sound: true, bgm: true },
  });
const Root = () =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(Original),
    React.createElement(Composition, {
      id: 'AgentTMUpdated',
      component: UpdatedFilm,
      width: 1920,
      height: 1080,
      fps: FPS,
      durationInFrames: TOTAL_FRAMES,
      defaultProps: { sound: true },
    }),
  );
registerRoot(Root);
