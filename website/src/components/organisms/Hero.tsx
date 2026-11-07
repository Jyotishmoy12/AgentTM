import { links } from '../../content';
import { Icon } from '../atoms/Icon';
import { ProductHuntBadge } from '../molecules/ProductHuntBadge';
import { AmbientField } from './AmbientField';
import { HeroFilm } from './HeroFilm';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <AmbientField />
      <div className="hero-grid" aria-hidden="true" />
      <div className="container hero-content">
        <a className="release-pill" href={links.releases}>
          <span className="status-dot" /> Public beta <span className="pill-divider">/</span> Your
          agent’s history, on your device <Icon name="arrow" />
        </a>
        <ProductHuntBadge />
        <p className="eyebrow">LOCAL-FIRST · CODEX SESSION HISTORY</p>
        <h1 id="hero-title">
          Your agent moved fast.
          <br />
          <span>Know what happened.</span>
        </h1>
        <p className="hero-description">
          Time-travel debugging for AI coding agents. Record managed Codex sessions, inspect
          workspace checkpoints, and restore earlier files into isolated Git worktrees.
        </p>
        <div className="hero-actions">
          <a className="button" href="#install">
            <Icon name="download" /> Download AgentTM
          </a>
          <a className="button button-secondary" href={links.repo}>
            <Icon name="github" /> View on GitHub
          </a>
        </div>
        <p className="platform-note">
          Windows desktop <span>·</span> Windows / macOS / Linux CLI
        </p>
        <div className="hero-preview">
          <span className="preview-corner corner-tl" aria-hidden="true" />
          <span className="preview-corner corner-tr" aria-hidden="true" />
          <span className="preview-edge-label" aria-hidden="true">
            WORKSPACE HISTORY / 001
          </span>
          <HeroFilm />
        </div>
        <div className="preview-caption" id="hero-film-caption">
          <span>
            <i className="status-dot" /> Current desktop source build · 40-second recorded demo
          </span>
          <span>Record. Inspect. Restore.</span>
        </div>
        <div className="capability-strip">
          <span>
            <Icon name="timeline" />
            Supported Codex events
          </span>
          <span>
            <Icon name="layers" />
            Workspace observations
          </span>
          <span>
            <Icon name="branch" />
            Isolated restoration
          </span>
          <span>
            <Icon name="lock" />
            Stored on your device
          </span>
        </div>
      </div>
    </section>
  );
}
