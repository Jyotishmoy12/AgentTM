import { links, showcases } from '../../content';
import { moveTab } from '../../utils/moveTab';
import { Icon } from '../atoms/Icon';

export function FeatureShowcaseFocusRail({
  model,
}: {
  model: {
    advancing: boolean;
    narrow: boolean;
    active: number;
    select: (value: number) => void;
    summaries: string[];
    enabled: boolean;
    setPlaying: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    playing: boolean;
  };
}) {
  const { advancing, narrow, active, select, summaries, enabled, setPlaying, playing } = model;
  return (
    <aside className="focus-rail">
      <header className="focus-heading">
        <p className="eyebrow">YOUR RUN. IN FOCUS.</p>
        <h2 id="showcase-title">
          See the work.
          <br />
          <span>Keep the context.</span>
        </h2>
        <p>Find the moment. Inspect the files. Recover an earlier workspace.</p>
      </header>

      <div
        className={'showcase-tabs focus-tabs ' + (advancing ? 'is-advancing' : '')}
        role="tablist"
        aria-label="Explore AgentTM features"
        aria-orientation={narrow ? 'horizontal' : 'vertical'}
      >
        {showcases.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={'tab-' + item.id}
            aria-label={item.label}
            aria-selected={active === i}
            aria-controls={'panel-' + item.id}
            tabIndex={active === i ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(event) => moveTab(event, i, showcases.length, select)}
          >
            <span className="focus-tab-icon">
              <Icon name={item.icon} />
            </span>
            <span className="focus-tab-body">
              <strong>{item.label}</strong>
              <span>{summaries[i]}</span>
            </span>
            <span className="focus-tab-number">{item.number}</span>
          </button>
        ))}
      </div>
      <div className="focus-tour">
        <button
          type="button"
          disabled={!enabled}
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing && enabled ? 'Pause walkthrough' : 'Play walkthrough'}
        >
          <span className="tour-play">
            <Icon name={playing && enabled ? 'pause' : 'play'} />
          </span>
          {playing && enabled ? 'Pause walkthrough' : 'Play walkthrough'}
        </button>
        <small>
          {playing && enabled
            ? '3 seconds per view · pauses over the capture'
            : 'Explore at your own pace, or play the tour.'}
        </small>
      </div>
      <a className="focus-guide" href={links.docs}>
        Explore the user guide <Icon name="arrow" />
      </a>
    </aside>
  );
}
