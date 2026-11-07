import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { MotionContext } from '../../contexts/MotionContext';

export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const enabled = !paused && !reduced;
  return (
    <MotionContext.Provider
      value={{ enabled, reduced, toggle: () => setPaused((value) => !value) }}
    >
      <div className="marketing-site" data-motion={enabled ? 'running' : 'paused'}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}
