import type { Platform } from '../../content';
import { links, platforms } from '../../content';
import { Icon } from '../atoms/Icon';
import { PlatformMark } from '../atoms/PlatformMark';

export function DocsInstallDownloadHero({
  model,
}: {
  model: {
    platform: 'windows' | 'macos' | 'linux';
    choosePlatform: (value: Platform) => void;
    desktop: boolean;
    chooseMode: (value: 'desktop' | 'cli') => void;
    architecture:
      | 'Intel / AMD 64-bit · Portable desktop preview'
      | 'Apple silicon & Intel · CLI + browser dashboard'
      | 'amd64 & ARM64 · CLI + browser dashboard';
  };
}) {
  const { platform, choosePlatform, desktop, chooseMode, architecture } = model;
  return (
    <div className="download-hero">
      <p className="eyebrow">YOUR NEXT RUN DESERVES A HISTORY</p>
      <h2 id="install-title">
        Meet your new
        <br />
        <span>way back.</span>
      </h2>
      <p className="download-intro">
        Start with one project. Record a run.
        <br />
        See what happened, and keep a clearer way to recover.
      </p>
      <fieldset className="platform-options">
        <legend className="sr-only">Operating system</legend>
        {(Object.keys(platforms) as Platform[]).map((key) => (
          <label key={key} className={platform === key ? 'is-selected' : ''}>
            <input
              type="radio"
              name="install-platform"
              value={key}
              checked={platform === key}
              onChange={() => choosePlatform(key)}
            />
            <PlatformMark platform={key} />
            <span>{platforms[key].label}</span>
          </label>
        ))}
      </fieldset>
      <div className="download-mode" role="group" aria-label="Application type">
        <button
          type="button"
          aria-label="Desktop app"
          aria-pressed={desktop}
          disabled={platform !== 'windows'}
          onClick={() => chooseMode('desktop')}
        >
          Desktop app <small>Windows</small>
        </button>
        <button
          type="button"
          aria-label="CLI and browser dashboard"
          aria-pressed={!desktop}
          onClick={() => chooseMode('cli')}
        >
          CLI + browser
        </button>
      </div>
      <div className="download-primary">
        <span className="download-ribbon">
          <i className="status-dot" />
          {desktop ? 'NATIVE WINDOWS DESKTOP PREVIEW' : 'ONE BINARY. YOUR LOCAL DASHBOARD.'}
        </span>
        <a className="download-main-button" href={links.releases}>
          <PlatformMark platform={platform} />
          <span>
            Get AgentTM for {platforms[platform].label}
            <small>{architecture}</small>
          </span>
          <Icon name="download" />
        </a>
      </div>
      <p className="release-destination">
        Opens GitHub Releases · Choose the matching archive in Assets.
      </p>
      <a className="platform-guide-link" href={platforms[platform].href}>
        {platforms[platform].label} install guide <Icon name="arrow" />
      </a>
      <p className="download-prerequisites">
        Git 2.42+ · A Git project · Codex installed and authenticated for recording
        {desktop ? ' · WebView2' : ''}
        <br />
        Go and Node.js are not required for prebuilt AgentTM binaries.
      </p>
    </div>
  );
}
