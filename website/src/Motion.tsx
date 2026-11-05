import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const MotionContext = createContext({
  enabled: true,
  reduced: false,
  toggle: () => {},
});

export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const enabled = !paused && !reduced;
  return (
    <MotionContext.Provider
      value={{ enabled, reduced, toggle: () => setPaused((value) => !value) }}
    >
      <div
        className="marketing-site"
        data-motion={enabled ? "running" : "paused"}
      >
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function useMotion() {
  return useContext(MotionContext);
}

function useSceneVisibility() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => !("IntersectionObserver" in window),
  );
  useEffect(() => {
    if (!host.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "100px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return { host, visible };
}

/** Content stays in the document; reduced motion and keyboard focus reveal it immediately. */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => !("IntersectionObserver" in window),
  );
  useEffect(() => {
    if (!host.current) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.04, rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className={`reveal ${className}`} ref={host} data-visible={visible}>
      {children}
    </div>
  );
}

export function AmbientField() {
  const { host, visible } = useSceneVisibility();
  return (
    <div
      ref={host}
      className="ambient-field"
      data-active={visible}
      aria-hidden="true"
    >
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <svg
        className="contour-field"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="contour-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#9eaf8c" stopOpacity="0" />
            <stop offset=".5" stopColor="#9eaf8c" stopOpacity=".3" />
            <stop offset="1" stopColor="#9eaf8c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            d={`M ${280 + i * 27} -80 C ${1450 + i * 15} 220, ${-100 + i * 23} 390, ${780 + i * 40} 1050`}
            fill="none"
            stroke="url(#contour-stroke)"
            strokeWidth={i % 4 === 0 ? 1.2 : 0.5}
            opacity={i % 3 === 0 ? 0.65 : 0.23}
          />
        ))}
        <path
          className="light-trail"
          pathLength="1"
          d="M 440 -80 C 1540 220, 38 390, 1040 1050"
          fill="none"
          stroke="#afc697"
          strokeWidth="1.5"
        />
      </svg>
      <span className="grid-cross cross-one" />
      <span className="grid-cross cross-two" />
      <span className="grid-cross cross-three" />
      <span className="grid-cross cross-four" />
    </div>
  );
}

export function FeatureDiagram({ kind }: { kind: number }) {
  const { host, visible } = useSceneVisibility();
  // These are intentionally schematic illustrations, never represented as live data.
  return (
    <div
      ref={host}
      className={`feature-diagram diagram-${kind}`}
      data-active={visible}
      aria-hidden="true"
    >
      <span className="diagram-grid" />
      {kind === 0 && (
        <div className="local-diagram">
          <div className="mini-window">
            <span className="mini-title">
              YOUR WORKSPACE <i />
            </span>
            <span className="mini-file">
              .agenttm/ <em>local</em>
            </span>
            <span className="mini-file indent">data/events.db</span>
            <span className="mini-file indent">manifests/</span>
            <span className="mini-file indent">objects/</span>
          </div>
          <span className="orbit-lock">⌂</span>
        </div>
      )}
      {kind === 1 && (
        <div className="dedup-diagram">
          <div className="hash-sources">
            <span>checkpoint A</span>
            <span>checkpoint B</span>
            <span>checkpoint C</span>
          </div>
          <svg viewBox="0 0 110 100">
            <path d="M0 15C75 15 20 50 105 50M0 50H105M0 85C75 85 20 50 105 50" />
            <path className="data-packet" d="M0 15C75 15 20 50 105 50" />
          </svg>
          <span className="hash-object">
            SHA-256<small>shared file bytes</small>
          </span>
        </div>
      )}
      {kind === 2 && (
        <div className="conversation-diagram">
          <span className="mini-bubble">Explain this project.</span>
          <span className="mini-bubble answer">
            <i />
            <i />
            <i />
          </span>
          <span className="continue-thread">
            <span /> Continue conversation <b>↵</b>
          </span>
        </div>
      )}
      {kind === 3 && (
        <div className="backup-diagram">
          <span className="backup-file">
            history.age<small>Encrypted backup</small>
          </span>
          <div className="password-dots">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="encrypted-chip">↳ &nbsp; Passphrase protected</span>
        </div>
      )}
      {kind === 4 && (
        <div className="integrity-diagram">
          <div className="mini-terminal">
            <span className="mini-title">DIAGNOSTIC EXAMPLE</span>
            <span>
              <b>$</b> agenttm doctor
            </span>
            <span className="check-line">✓ SQLite integrity</span>
            <span className="check-line second">✓ Snapshot objects</span>
          </div>
        </div>
      )}
      {kind === 5 && (
        <div className="storage-diagram">
          <div className="object-cells">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} className={i > 17 ? "unreferenced" : ""} />
            ))}
          </div>
          <span className="storage-legend">
            <i /> Referenced <i className="unreferenced" /> Unreferenced
          </span>
        </div>
      )}
      <span className="diagram-caption">SCHEMATIC · NOT LIVE DATA</span>
    </div>
  );
}
