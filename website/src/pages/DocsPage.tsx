import { useEffect, useRef, useState } from 'react';
import { Brand } from '../components/atoms/Brand';
import { Icon } from '../components/atoms/Icon';
import { DocsContent2 } from '../components/organisms/DocsContent2';
import { links } from '../content';
import { home } from '../data/DocsPage';
import { guides } from '../data/DocsShared';
import type { Topic } from '../types/DocsShared';
import { topicFromURL } from '../utils/topicFromURL';
import { DocsContent } from './DocsContent';

export function DocsPage() {
  const [topic, setTopic] = useState<Topic>(topicFromURL);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const mobileSearch = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dialog = mobileDialog.current;
    if (!menuOpen) {
      dialog?.close();
      return;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    mobileSearch.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);
  useEffect(() => {
    const media = matchMedia('(max-width: 650px)');
    const resize = () => {
      if (!media.matches) setMenuOpen(false);
    };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  const title = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const change = () => {
      if (location.hash !== '#docs-content') setTopic(topicFromURL());
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.title = `${guides.find((guide) => guide.id === topic)!.title} — AgentTM Docs`;
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    title.current?.focus({ preventScroll: true });
  }, [topic]);
  const guide = guides.find((item) => item.id === topic)!;
  const filtered = guides.filter((item) =>
    `${item.title} ${item.description} ${item.group}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  function guideNavigation(mobile = false) {
    return (
      <DocsContent2
        model={{ mobile, mobileSearch, query, setQuery, Set, filtered, setMenuOpen, topic }}
      />
    );
  }
  return (
    <div className="marketing-site docs-site">
      <a className="skip-link" href="#docs-content">
        Skip to documentation
      </a>
      <header className="docs-topbar">
        <Brand href={home} />
        <a className="docs-wordmark" href={`${import.meta.env.BASE_URL}docs.html`}>
          Documentation
        </a>
        <nav aria-label="Documentation header">
          <a href={home}>Home</a>
          <a href={links.releases}>
            Releases <Icon name="arrow" />
          </a>
          <a href={links.repo} aria-label="AgentTM on GitHub">
            <Icon name="github" />
          </a>
        </nav>
        <button
          type="button"
          className="docs-menu-button"
          aria-label="Open documentation navigation"
          aria-expanded={menuOpen}
          aria-controls="docs-mobile-navigation"
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="menu" />
        </button>
      </header>
      <dialog
        ref={mobileDialog}
        id="docs-mobile-navigation"
        className="docs-mobile-drawer"
        aria-labelledby="docs-drawer-title"
        onCancel={(event) => {
          event.preventDefault();
          setMenuOpen(false);
        }}
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            setMenuOpen(false);
        }}
      >
        <div className="docs-drawer-heading">
          <div>
            <span className="eyebrow">AGENTTM</span>
            <h2 id="docs-drawer-title">Documentation</h2>
          </div>
          <button
            type="button"
            aria-label="Close documentation navigation"
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        {guideNavigation(true)}
      </dialog>
      <div className="docs-layout">
        <aside className={`docs-guide-sidebar ${query ? 'is-searching' : ''}`}>
          {guideNavigation()}
        </aside>
        <main id="docs-content" className="docs-article" key={topic} tabIndex={-1}>
          <header className="docs-article-heading">
            <p className="eyebrow">DOCUMENTATION / {guide.group.toUpperCase()}</p>
            <h1 ref={title} tabIndex={-1}>
              {guide.title}
            </h1>
            <p>{guide.description}</p>
          </header>
          <DocsContent topic={topic} />
          <footer className="docs-article-footer">
            <a href="#start">Choose your setup</a>
            <a href={`${links.repo}/blob/main/docs/user-guide.md`}>
              Repository user guide <Icon name="arrow" />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
