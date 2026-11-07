import { showcases } from '../../content';
import { Icon } from '../atoms/Icon';
import { FeatureShowcaseFocusRail } from './FeatureShowcaseFocusRail';

export function FeatureShowcaseContainer({
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
    setHovered: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    captureLabels: string[];
    setCapture: import('react').Dispatch<import('react').SetStateAction<number | null>>;
    visible: boolean;
  };
}) {
  const {
    advancing,
    narrow,
    active,
    select,
    summaries,
    enabled,
    setPlaying,
    playing,
    setHovered,
    captureLabels,
    setCapture,
    visible,
  } = model;
  return (
    <div className="container">
      <div className="focus-layout">
        <FeatureShowcaseFocusRail
          model={{ advancing, narrow, active, select, summaries, enabled, setPlaying, playing }}
        />
        <div className="focus-panel-stack">
          {showcases.map((item, i) => (
            <div
              key={item.id}
              id={'panel-' + item.id}
              role="tabpanel"
              aria-labelledby={'tab-' + item.id}
              className={active === i ? 'is-active' : ''}
              aria-hidden={active !== i}
              inert={active !== i}
              tabIndex={active === i ? 0 : -1}
            >
              <>
                <div
                  className="focus-viewer"
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                >
                  <div className="focus-viewer-bar">
                    <span>
                      <Icon name={item.icon} />
                      {captureLabels[i]}
                    </span>
                    <button
                      type="button"
                      className="capture-expand"
                      onClick={() => setCapture(i)}
                      aria-label="Enlarge capture"
                    >
                      <span>Enlarge</span>
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      >
                        <path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className={'focus-shot focus-shot-' + item.id}>
                    <img
                      src={import.meta.env.BASE_URL + 'images/' + item.image}
                      width={item.width}
                      height={item.height}
                      alt={item.alt}
                      loading={visible ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </div>
                  <div className="focus-image-label">
                    <span>
                      <i className="status-dot" />
                      ACTUAL AGENTTM CAPTURE
                    </span>
                    <span>
                      {item.id === 'restore' ? 'RECORDED WORKTREES' : 'CURRENT INTERFACE'}
                    </span>
                  </div>
                </div>
                <div className="focus-caption">
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </>
            </div>
          ))}
        </div>
      </div>
      <p className="focus-accuracy">
        <Icon name="shield" />A real recording in a disposable project. Checkpoints are
        observations, not proof of which action caused a change.
      </p>
    </div>
  );
}
