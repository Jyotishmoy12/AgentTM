import { features, links } from '../../content';
import { Icon } from '../atoms/Icon';
import { FeatureDiagram } from './FeatureDiagram';

export function FeatureGrid() {
  return (
    <section className="container section feature-section" aria-labelledby="feature-title">
      <div className="section-heading">
        <p className="eyebrow">BUILT FOR THE INVESTIGATION</p>
        <h2 id="feature-title">The details that keep history useful.</h2>
        <p>A local index, shared file content, and explicit tools to manage what you keep.</p>
      </div>
      <div className="feature-grid">
        {features.map((feature, index) => (
          <article
            key={feature.title}
            className={`feature-card feature-card-${index}`}
            onPointerMove={(event) => {
              if (event.pointerType !== 'mouse') return;
              const box = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - box.left}px`);
              event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - box.top}px`);
            }}
          >
            <FeatureDiagram kind={index} />
            <div className="feature-card-copy">
              <Icon name={feature.icon} />
              <span className="feature-tag">{feature.tag}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="feature-footnote">
        Feature availability depends on the selected release.{' '}
        <a href={links.releases}>Check release notes and assets ↗</a>
      </p>
    </section>
  );
}
