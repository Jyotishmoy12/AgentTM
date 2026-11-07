import { useEffect, useRef, useState } from 'react';

export function useSceneVisibility() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window));
  useEffect(() => {
    if (!host.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: '100px' },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return { host, visible };
}
