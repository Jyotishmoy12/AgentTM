import { useEffect, useRef, useState } from 'react';
import { useMotion } from './useMotion';

export function useHeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const { enabled } = useMotion();
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window));
  const [loaded, setLoaded] = useState(() => !('IntersectionObserver' in window));
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!hostRef.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: '160px 0px', threshold: 0.05 },
    );
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    let active = true;
    node.muted = true;
    node.defaultMuted = true;
    const sync = () => {
      if (visible && loaded && enabled && !document.hidden) {
        void node
          .play()
          .then(() => {
            if (active) setBlocked(false);
          })
          .catch(() => {
            if (active) setBlocked(true);
          });
      } else node.pause();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', sync);
      node.pause();
    };
  }, [visible, loaded, enabled]);
  async function retry() {
    const node = videoRef.current;
    if (!node) return;
    node.muted = true;
    if (node.error) node.load();
    try {
      await node.play();
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  }
  return {
    videoRef,
    hostRef,
    enabled,
    loaded,
    blocked,
    retry,
    unavailable: () => setBlocked(true),
  };
}
