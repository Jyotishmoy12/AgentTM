import { useEffect, useRef, useState } from 'react';
import { showcases } from '../../content';
import { useMotion } from '../../hooks/useMotion';
import { Icon } from '../atoms/Icon';
import { FeatureShowcaseContainer } from './FeatureShowcaseContainer';

export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const { enabled } = useMotion();
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [capture, setCapture] = useState<number | null>(null);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width:760px)').matches);
  const host = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const advancing =
    enabled && playing && visible && !hovered && !focused && pageVisible && capture === null;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.15 },
    );
    if (host.current) observer.observe(host.current);
    const visibility = () => setPageVisible(!document.hidden);
    const media = matchMedia('(max-width:760px)');
    const resize = () => setNarrow(media.matches);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', resize);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', resize);
    };
  }, []);
  useEffect(() => {
    if (!advancing) return;
    const timer = window.setTimeout(
      () => setActive((value) => (value + 1) % showcases.length),
      3000,
    );
    return () => window.clearTimeout(timer);
  }, [advancing, active]);
  useEffect(() => {
    if (capture !== null && !dialog.current?.open) dialog.current?.showModal();
    else if (capture === null && dialog.current?.open) dialog.current.close();
  }, [capture]);
  function select(value: number) {
    setActive(value);
    setPlaying(false);
  }
  const summaries = [
    'Follow recorded events and the workspace observed near them.',
    'Inspect a historical file and compare it with its parent checkpoint.',
    'Recover captured files in a separate working copy.',
  ];
  const captureLabels = [
    'History / recorded activity & checkpoints',
    'src/cart.ts / checkpoint diff',
    'Restored workspaces / isolated working copies',
  ];
  const captured = capture === null ? null : showcases[capture];
  return (
    <section
      className="focused-showcase section"
      id="features"
      aria-labelledby="showcase-title"
      ref={host}
      onFocusCapture={(event) =>
        setFocused(!!(event.target as Element).closest('[role="tab"], [role="tabpanel"], dialog'))
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <FeatureShowcaseContainer
        model={{
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
        }}
      />
      <dialog
        ref={dialog}
        className="capture-dialog"
        aria-label="Enlarged AgentTM capture"
        onCancel={() => setCapture(null)}
        onClose={() => setCapture(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setCapture(null);
        }}
      >
        <div className="capture-dialog-bar">
          <span>{captured?.label}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setCapture(null)}
            aria-label="Close enlarged capture"
          >
            <Icon name="close" />
          </button>
        </div>
        {captured && (
          <>
            <div className="capture-dialog-image">
              <img
                src={import.meta.env.BASE_URL + 'images/' + captured.image}
                width={captured.width}
                height={captured.height}
                alt={captured.alt}
              />
            </div>
            <p>
              Current interface, captured from the disposable recorded demo.{' '}
              <a
                href={import.meta.env.BASE_URL + 'images/' + captured.image}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open image at original resolution ↗
              </a>
            </p>
          </>
        )}
      </dialog>
    </section>
  );
}
