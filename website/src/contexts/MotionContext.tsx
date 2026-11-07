import { createContext } from 'react';

export const MotionContext = createContext({
  enabled: true,
  reduced: false,
  toggle: () => {},
});
