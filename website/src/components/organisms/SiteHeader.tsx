import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { links } from '../../content';
import { useMotion } from '../../hooks/useMotion';
import { Brand } from '../atoms/Brand';
import { Icon } from '../atoms/Icon';

export function SiteHeader() {
  const { enabled, reduced, toggle } = useMotion();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  function closeMenu(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false);
      menuButton.current?.focus();
    }
  }
  return (
    <header className="site-header" onKeyDown={closeMenu}>
      <div className="container nav-inner">
        <Brand />
        <nav
          aria-label="Main navigation"
          id="main-navigation"
          className={open ? 'navigation is-open' : 'navigation'}
        >
          {[
            ['Features', '#features'],
            ['How it works', '#how-it-works'],
            ['Compare with Git', '#compare'],
            ['Install', '#install'],
            ['Docs', links.docs],
          ].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <button
            type="button"
            className="icon-button motion-toggle"
            onClick={toggle}
            disabled={reduced}
            aria-label={
              reduced
                ? 'System reduced motion enabled'
                : enabled
                  ? 'Pause animations'
                  : 'Resume animations'
            }
            title={
              reduced
                ? 'Animations disabled by your system preference'
                : enabled
                  ? 'Pause animations'
                  : 'Resume animations'
            }
          >
            <Icon name={enabled ? 'pause' : 'play'} />
          </button>
          <a className="github-link" href={links.repo} aria-label="AgentTM on GitHub">
            <Icon name="github" />
          </a>
          <a className="button button-small" href="#install">
            Download <Icon name="download" />
          </a>
          <button
            ref={menuButton}
            type="button"
            className="icon-button menu-button"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}
