import { useState } from 'react';
import type { Platform } from '../../content';
import { links, platforms } from '../../content';
import { docTabs } from '../../data/App';
import type { IconName } from '../../types/App';
import { moveTab } from '../../utils/moveTab';
import { Icon } from '../atoms/Icon';
import { DocsInstallContent4 } from './DocsInstallContent4';
import { DocsInstallDownloadHero } from './DocsInstallDownloadHero';

export function DocsInstall() {
  const [active, setActive] = useState(2);
  const [platform, setPlatform] = useState<Platform>('windows');
  const [mode, setMode] = useState<'desktop' | 'cli'>('desktop');
  const desktop = platform === 'windows' && mode === 'desktop';
  function choosePlatform(value: Platform) {
    setPlatform(value);
    if (value !== 'windows') {
      setMode('cli');
      setActive(0);
    } else setActive(mode === 'desktop' ? 2 : 0);
  }
  function chooseMode(value: 'desktop' | 'cli') {
    setMode(value);
    setActive(value === 'desktop' ? 2 : 0);
  }
  const architecture = desktop
    ? 'Intel / AMD 64-bit · Portable desktop preview'
    : platform === 'macos'
      ? 'Apple silicon & Intel · CLI + browser dashboard'
      : 'amd64 & ARM64 · CLI + browser dashboard';
  const journey = desktop
    ? [
        [
          'download',
          'Choose the desktop ZIP',
          'Get the separate Windows desktop archive and SHA256SUMS from the same release.',
        ],
        [
          'shield',
          'Verify. Then extract.',
          'Compare the archive’s checksum before extracting. Keep both executables together.',
        ],
        [
          'chat',
          'Open your workspace',
          'Follow the Windows guide to launch AgentTM, select your project, and set up Codex.',
        ],
      ]
    : [
        [
          'download',
          'Choose your CLI archive',
          'Get the archive for your OS and architecture, its installer, and SHA256SUMS.',
        ],
        [
          'shield',
          'Verify and install',
          'Follow your platform guide to check the hash and install the CLI. Open a fresh terminal.',
        ],
        [
          'terminal',
          'Record your first session',
          'Initialize history in a Git project, check Codex, then run a small task and open the dashboard.',
        ],
      ];
  return (
    <section
      className="install-section section editorial-install"
      id="install"
      aria-labelledby="install-title"
    >
      <div className="container">
        <DocsInstallDownloadHero
          model={{ platform, choosePlatform, desktop, chooseMode, architecture }}
        />
        <div className="install-journey">
          <div className="journey-heading">
            <span className="eyebrow">THREE STEPS. ONE LOCAL HISTORY.</span>
            <h3>{desktop ? 'From download to desktop.' : 'From download to your first run.'}</h3>
            <a href={platforms[platform].href}>
              Follow the full guide <Icon name="arrow" />
            </a>
          </div>
          <ol>
            {journey.map(([icon, title, copy], i) => (
              <li key={title}>
                <span className="journey-step-number">0{i + 1}</span>
                <Icon name={icon as IconName} />
                <h4>{title}</h4>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="install-reference-heading">
          <span className="eyebrow">A LITTLE HELP, WHEN YOU NEED IT</span>
          <h3>Your first session starts here.</h3>
          <p>Pick a topic for the details. Desktop and CLI have separate setup paths.</p>
        </div>
        <div className="docs-shell">
          <aside className="docs-sidebar">
            <span className="docs-sidebar-heading">
              <Icon name="terminal" /> Getting started
            </span>
            <div role="tablist" aria-label="Installation topics" aria-orientation="horizontal">
              {docTabs.map((title, i) => (
                <button
                  type="button"
                  key={title}
                  id={`doc-tab-${i}`}
                  role="tab"
                  aria-selected={active === i}
                  aria-controls={`doc-panel-${i}`}
                  tabIndex={active === i ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => moveTab(e, i, docTabs.length, setActive)}
                >
                  <span className="mono">0{i + 1}</span>
                  {title}
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
            <a href={links.docs}>
              Full documentation <span aria-hidden="true">↗</span>
            </a>
          </aside>
          {docTabs.map((title, i) => (
            <div
              key={title}
              className="docs-content"
              role="tabpanel"
              id={`doc-panel-${i}`}
              aria-labelledby={`doc-tab-${i}`}
              hidden={active !== i}
              tabIndex={0}
            >
              {active === i && <DocsInstallContent4 model={{ title, i, setActive }} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
