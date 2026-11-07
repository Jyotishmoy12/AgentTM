import { useContext } from 'react';
import { MotionContext } from '../contexts/MotionContext';

export function useMotion() {
  return useContext(MotionContext);
}
