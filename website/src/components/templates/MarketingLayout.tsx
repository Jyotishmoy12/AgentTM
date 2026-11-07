import type { ReactNode } from 'react';
import { MotionProvider } from '../organisms/MotionProvider';
import { SiteFooter } from '../organisms/SiteFooter';
import { SiteHeader } from '../organisms/SiteHeader';

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div id="top" />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </MotionProvider>
  );
}
