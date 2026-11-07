import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window));
  useEffect(() => {
    if (!host.current) return;
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.04, rootMargin: '0px 0px -24px 0px' },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className={`reveal ${className}`} ref={host} data-visible={visible}>
      {children}
    </div>
  );
}
