import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Film, TOTAL } from './Film';

const Root = () => React.createElement(Composition, {
  id: 'AgentTMLaunch', component: Film, width: 1920, height: 1080,
  fps: 30, durationInFrames: TOTAL, defaultProps: { sound: true, bgm: true },
});
registerRoot(Root);
