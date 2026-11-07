import { links } from '../../content';
import { Icon } from '../atoms/Icon';

export function FinalCTA() {
  return (
    <section className="final-cta" aria-labelledby="final-title">
      <div className="container">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="52" height="52" alt="" />
        <p className="eyebrow">MAKE THE NEXT RUN EASIER TO UNDERSTAND</p>
        <h2 id="final-title">
          See what happened.
          <br />
          <span>Recover with confidence.</span>
        </h2>
        <div className="hero-actions">
          <a className="button" href="#install">
            Download AgentTM <Icon name="download" />
          </a>
          <a className="button button-secondary" href={links.repo}>
            Explore on GitHub <Icon name="arrow" />
          </a>
        </div>
        <p className="platform-note">
          Your history, on your device. Codex uses its configured service.
        </p>
      </div>
    </section>
  );
}
