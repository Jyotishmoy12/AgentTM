import { home } from '../../data/DocsPage';
import { guides } from '../../data/DocsShared';
import { Icon } from '../atoms/Icon';

export function DocsContent2({
  model,
}: {
  model: {
    mobile: boolean;
    mobileSearch: import('react').RefObject<HTMLInputElement | null>;
    query: string;
    setQuery: import('react').Dispatch<import('react').SetStateAction<string>>;
    Set: SetConstructor;
    filtered: (
      | {
          readonly id: 'start';
          readonly group: 'Start here';
          readonly title: 'Choose your setup';
          readonly description: 'Desktop or CLI: choose one path before installing.';
          readonly icon: 'layers';
        }
      | {
          readonly id: 'desktop-install';
          readonly group: 'Windows desktop';
          readonly title: 'Install the desktop app';
          readonly description: 'Download, verify, extract, and open your project.';
          readonly icon: 'download';
        }
      | {
          readonly id: 'desktop-record';
          readonly group: 'Windows desktop';
          readonly title: 'Your first conversation';
          readonly description: 'Set up Codex, choose permissions, and record a turn.';
          readonly icon: 'chat';
        }
      | {
          readonly id: 'desktop-storage';
          readonly group: 'Windows desktop';
          readonly title: 'Backups & storage';
          readonly description: 'Create an encrypted backup, restore history, and preview cleanup.';
          readonly icon: 'database';
        }
      | {
          readonly id: 'cli-install';
          readonly group: 'CLI & browser dashboard';
          readonly title: 'Install the CLI';
          readonly description: 'Separate installation instructions for Windows, macOS, and Linux.';
          readonly icon: 'terminal';
        }
      | {
          readonly id: 'cli-record';
          readonly group: 'CLI & browser dashboard';
          readonly title: 'Record your first run';
          readonly description: 'Initialize a Git project, record Codex, and open the dashboard.';
          readonly icon: 'play';
        }
      | {
          readonly id: 'cli-commands';
          readonly group: 'CLI & browser dashboard';
          readonly title: 'Command reference';
          readonly description: 'Find sessions, checkpoints, diffs, diagnostics, and restore commands.';
          readonly icon: 'code';
        }
      | {
          readonly id: 'history';
          readonly group: 'Understand your history';
          readonly title: 'Explore a recording';
          readonly description: 'Sessions, recorded events, checkpoint files, and comparisons.';
          readonly icon: 'timeline';
        }
      | {
          readonly id: 'restore';
          readonly group: 'Understand your history';
          readonly title: 'Restore a checkpoint';
          readonly description: 'Review omissions and create a separate Git working copy.';
          readonly icon: 'branch';
        }
      | {
          readonly id: 'privacy';
          readonly group: 'Understand your history';
          readonly title: 'Capture & privacy';
          readonly description: 'Local data, prompt capture, exclusions, and observation limits.';
          readonly icon: 'lock';
        }
      | {
          readonly id: 'troubleshooting';
          readonly group: 'Help';
          readonly title: 'Troubleshooting';
          readonly description: 'Missing dependencies, model access, ports, PATH, and checksum errors.';
          readonly icon: 'shield';
        }
    )[];
    setMenuOpen: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    topic:
      | 'start'
      | 'desktop-install'
      | 'desktop-record'
      | 'desktop-storage'
      | 'cli-install'
      | 'cli-record'
      | 'cli-commands'
      | 'history'
      | 'restore'
      | 'privacy'
      | 'troubleshooting';
  };
}) {
  const { mobile, mobileSearch, query, setQuery, Set, filtered, setMenuOpen, topic } = model;
  return (
    <>
      <label className="docs-guide-search">
        <Icon name="timeline" />
        <input
          ref={mobile ? mobileSearch : undefined}
          type="search"
          aria-label="Find a guide"
          placeholder="Find a guide..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <nav aria-label="Documentation guides">
        {Array.from(new Set(guides.map((item) => item.group))).map((group) => {
          const items = filtered.filter((item) => item.group === group);
          return items.length ? (
            <div className="docs-nav-group" key={group}>
              <h2>{group}</h2>
              {items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => {
                    if (mobile) setMenuOpen(false);
                  }}
                  aria-current={topic === item.id ? 'page' : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{item.title}</span>
                </a>
              ))}
            </div>
          ) : null;
        })}
        {!filtered.length && (
          <p className="docs-no-guides" role="status">
            No matching guides. Try “desktop”, “CLI”, or “restore”.
          </p>
        )}
      </nav>
      <a className="docs-sidebar-home" href={home}>
        <Icon name="arrow" />
        Back to AgentTM
      </a>
    </>
  );
}
