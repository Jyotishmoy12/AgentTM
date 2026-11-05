import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  commands,
  features,
  gitComparison,
  links,
  platforms,
  showcases,
  type Platform,
} from "./content";
import {
  AmbientField,
  FeatureDiagram,
  MotionProvider,
  Reveal,
  useMotion,
} from "./Motion";

type IconName =
  | "arrow"
  | "download"
  | "github"
  | "play"
  | "pause"
  | "timeline"
  | "code"
  | "branch"
  | "lock"
  | "database"
  | "chat"
  | "shield"
  | "check"
  | "layers"
  | "copy"
  | "terminal"
  | "menu"
  | "close";

export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    github: (
      <>
        <path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1-.4-2-1-2 4 0 7-2 7-6 0-2-.7-3-2-4 .2-1 .2-2-.2-3 0 0-2-.1-4 2-2-.5-4-.5-6 0-2-2-4-2-4-2-.5 1-.5 2-.2 3C3 7 3 8 3 10c0 4 3 6 7 6-.6.5-1 1-1 2v4" />
      </>
    ),
    play: <path d="m9 5 11 7-11 7z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    timeline: (
      <>
        <path d="M8 5h13M8 12h13M8 19h13" />
        <circle cx="3" cy="5" r="1" />
        <circle cx="3" cy="12" r="1" />
        <circle cx="3" cy="19" r="1" />
      </>
    ),
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />,
    branch: (
      <>
        <circle cx="6" cy="4" r="2" />
        <circle cx="18" cy="5" r="2" />
        <circle cx="6" cy="20" r="2" />
        <path d="M6 6v12M18 7v2c0 5-12 3-12 8" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="12" rx="3" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
      </>
    ),
    chat: (
      <>
        <path d="M21 3H3v15h5v4l5-4h8zM7 8h10M7 12h6" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 9 4v6c0 5-5 9-9 10-4-1-9-5-9-10V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    layers: (
      <>
        <path d="m12 2 10 6-10 6L2 8zm-10 11 10 6 10-6M2 18l10 6 10-6" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    terminal: <path d="m4 5 6 6-6 6m9 1h7" />,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Brand({ href = "#top" }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="AgentTM home">
      <img
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        width="36"
        height="36"
        alt=""
      />
      <span>
        Agent<span className="brand-accent">TM</span>
      </span>
    </a>
  );
}

function SiteHeader() {
  const { enabled, reduced, toggle } = useMotion();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  function closeMenu(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      menuButton.current?.focus();
    }
  }
  return (
    <header className="site-header" onKeyDown={closeMenu}>
      <div className="container nav-inner">
        <Brand />
        <nav
          aria-label="Main navigation"
          id="main-navigation"
          className={open ? "navigation is-open" : "navigation"}
        >
          {[
            ["Features", "#features"],
            ["How it works", "#how-it-works"],
            ["Compare with Git", "#compare"],
            ["Install", "#install"],
            ["Docs", links.docs],
          ].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <button
            type="button"
            className="icon-button motion-toggle"
            onClick={toggle}
            disabled={reduced}
            aria-label={
              reduced
                ? "System reduced motion enabled"
                : enabled
                  ? "Pause animations"
                  : "Resume animations"
            }
            title={
              reduced
                ? "Animations disabled by your system preference"
                : enabled
                  ? "Pause animations"
                  : "Resume animations"
            }
          >
            <Icon name={enabled ? "pause" : "play"} />
          </button>
          <a
            className="github-link"
            href={links.repo}
            aria-label="AgentTM on GitHub"
          >
            <Icon name="github" />
          </a>
          <a className="button button-small" href="#install">
            Download <Icon name="download" />
          </a>
          <button
            ref={menuButton}
            type="button"
            className="icon-button menu-button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}

function ProductPreview({
  image,
  alt,
  eager = false,
  chrome = true,
}: {
  image: string;
  alt: string;
  eager?: boolean;
  chrome?: boolean;
}) {
  return (
    <div className="product-frame">
      {chrome && (
        <div className="frame-bar">
          <span className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <Icon name="lock" /> AgentTM{" "}
            <span className="frame-separator">/</span> demo-checkout
          </span>
          <span className="frame-local">
            <i /> Local history
          </span>
        </div>
      )}
      <img
        src={`${import.meta.env.BASE_URL}images/${image}`}
        width="3200"
        height="2000"
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
      />
    </div>
  );
}

function DemoVideo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  return (
    <dialog
      className="demo-dialog"
      ref={dialog}
      onCancel={onClose}
      onClose={() => {
        video.current?.pause();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="video-title"
    >
      <div className="dialog-heading">
        <h2 id="video-title">AgentTM in 30 seconds</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close demo"
        >
          <Icon name="close" />
        </button>
      </div>
      {open && (
        <video
          ref={video}
          controls
          playsInline
          preload="metadata"
          poster={`${import.meta.env.BASE_URL}images/video-poster.png`}
        >
          <source
            src={`${import.meta.env.BASE_URL}media/agenttm-demo.mp4`}
            type="video/mp4"
          />
          <a href={`${import.meta.env.BASE_URL}media/agenttm-demo.mp4`}>
            Download the demo video
          </a>
        </video>
      )}
      <p>
        Earlier-interface workflow demo with music and sound effects. The
        screenshots on this page show the current design.{" "}
        <a href="https://github.com/Jyotishmoy12/AgentTM/blob/main/docs/videos/CREDITS.md">
          Video credits ↗
        </a>
      </p>
    </dialog>
  );
}

function Hero() {
  const [videoOpen, setVideoOpen] = useState(false);
  return (
    <section className="hero" aria-labelledby="hero-title">
      <AmbientField />
      <div className="hero-grid" aria-hidden="true" />
      <div className="container hero-content">
        <a className="release-pill" href={links.releases}>
          <span className="status-dot" /> Public beta{" "}
          <span className="pill-divider">/</span> Your agent’s history, on your
          device <Icon name="arrow" />
        </a>
        <p className="eyebrow">LOCAL-FIRST · CODEX SESSION HISTORY</p>
        <h1 id="hero-title">
          Your agent moved fast.
          <br />
          <span>Know what happened.</span>
        </h1>
        <p className="hero-description">
          Time-travel debugging for AI coding agents. Record managed Codex
          sessions, inspect workspace checkpoints, and restore earlier files
          into isolated Git worktrees.
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
        <button
          type="button"
          className="video-trigger"
          onClick={() => setVideoOpen(true)}
        >
          <span>
            <Icon name="play" />
          </span>{" "}
          Watch the 30-second demo <Icon name="arrow" />
        </button>
        <div className="hero-preview">
          <span className="preview-corner corner-tl" aria-hidden="true" />
          <span className="preview-corner corner-tr" aria-hidden="true" />
          <span className="preview-edge-label" aria-hidden="true">
            WORKSPACE HISTORY / 001
          </span>
          <ProductPreview
            image="history.png"
            alt="Current AgentTM History interface showing actual recorded Codex activity and captured workspace states in a disposable demo project."
            eager
          />
        </div>
        <div className="preview-caption">
          <span>
            <i className="status-dot" /> Current desktop source build ·
            disposable demo project
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
      <DemoVideo open={videoOpen} onClose={() => setVideoOpen(false)} />
    </section>
  );
}

function ProblemSection() {
  return (
    <section
      className="container problem section"
      aria-labelledby="problem-title"
    >
      <div className="problem-intro">
        <div>
          <p className="eyebrow">THE DIFF IS ONLY PART OF THE STORY</p>
          <h2 id="problem-title">
            The code changed.
            <br />
            <span>What happened in between?</span>
          </h2>
        </div>
        <p>
          A final diff shows where you landed. AgentTM gives you local execution
          history and workspace observations to investigate the path—and recover
          captured files when you need to.
        </p>
      </div>
      <div className="benefit-row">
        {[
          [
            "timeline",
            "See the sequence",
            "Follow supported events and commands from AgentTM-managed Codex sessions.",
          ],
          [
            "code",
            "Inspect the changes",
            "Browse historical files and compare the states observed near agent activity.",
          ],
          [
            "branch",
            "Keep your workspace",
            "Restore into a separate Git worktree while your original project stays in place.",
          ],
        ].map(([icon, title, text], i) => (
          <article key={title}>
            <div className="benefit-top">
              <Icon name={icon as IconName} />
              <span>0{i + 1}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// Automatic activation follows the WAI-ARIA tabs keyboard pattern.
function moveTab(
  event: KeyboardEvent,
  current: number,
  count: number,
  select: (value: number) => void,
) {
  let next: number;
  if (event.key === "ArrowRight" || event.key === "ArrowDown")
    next = (current + 1) % count;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
    next = (current + count - 1) % count;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = count - 1;
  else return;
  event.preventDefault();
  select(next);
  const buttons =
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
  buttons?.[next]?.focus();
}

function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const { enabled } = useMotion();
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [capture, setCapture] = useState<number | null>(null);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width:760px)").matches,
  );
  const host = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const advancing =
    enabled &&
    playing &&
    visible &&
    !hovered &&
    !focused &&
    pageVisible &&
    capture === null;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.15 },
    );
    if (host.current) observer.observe(host.current);
    const visibility = () => setPageVisible(!document.hidden);
    const media = matchMedia("(max-width:760px)");
    const resize = () => setNarrow(media.matches);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", resize);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", resize);
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
    "Follow recorded events and the workspace observed near them.",
    "Inspect a historical file and compare it with its parent checkpoint.",
    "Recover captured files in a separate working copy.",
  ];
  const captureLabels = [
    "History / recorded activity & checkpoints",
    "src/cart.ts / checkpoint diff",
    "Restored workspaces / isolated working copies",
  ];
  const captured = capture === null ? null : showcases[capture];
  return (
    <section
      className="focused-showcase section"
      id="features"
      aria-labelledby="showcase-title"
      ref={host}
      onFocusCapture={(event) =>
        setFocused(
          !!(event.target as Element).closest(
            '[role="tab"], [role="tabpanel"], dialog',
          ),
        )
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="container">
        <div className="focus-layout">
          <aside className="focus-rail">
            <header className="focus-heading">
              <p className="eyebrow">YOUR RUN. IN FOCUS.</p>
              <h2 id="showcase-title">
                See the work.
                <br />
                <span>Keep the context.</span>
              </h2>
              <p>
                Find the moment. Inspect the files. Recover an earlier
                workspace.
              </p>
            </header>

            <div
              className={
                "showcase-tabs focus-tabs " + (advancing ? "is-advancing" : "")
              }
              role="tablist"
              aria-label="Explore AgentTM features"
              aria-orientation={narrow ? "horizontal" : "vertical"}
            >
              {showcases.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={"tab-" + item.id}
                  aria-label={item.label}
                  aria-selected={active === i}
                  aria-controls={"panel-" + item.id}
                  tabIndex={active === i ? 0 : -1}
                  onClick={() => select(i)}
                  onKeyDown={(event) =>
                    moveTab(event, i, showcases.length, select)
                  }
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
                aria-label={
                  playing && enabled ? "Pause walkthrough" : "Play walkthrough"
                }
              >
                <span className="tour-play">
                  <Icon name={playing && enabled ? "pause" : "play"} />
                </span>
                {playing && enabled ? "Pause walkthrough" : "Play walkthrough"}
              </button>
              <small>
                {playing && enabled
                  ? "3 seconds per view · pauses over the capture"
                  : "Explore at your own pace, or play the tour."}
              </small>
            </div>
            <a className="focus-guide" href={links.docs}>
              Explore the user guide <Icon name="arrow" />
            </a>
          </aside>
          <div className="focus-panel-stack">
            {showcases.map((item, i) => (
              <div
                key={item.id}
                id={"panel-" + item.id}
                role="tabpanel"
                aria-labelledby={"tab-" + item.id}
                className={active === i ? "is-active" : ""}
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
                    <div className={"focus-shot focus-shot-" + item.id}>
                      <img
                        src={import.meta.env.BASE_URL + "images/" + item.image}
                        width={item.width}
                        height={item.height}
                        alt={item.alt}
                        loading={visible ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </div>
                    <div className="focus-image-label">
                      <span>
                        <i className="status-dot" />
                        ACTUAL AGENTTM CAPTURE
                      </span>
                      <span>
                        {item.id === "restore"
                          ? "RECORDED WORKTREES"
                          : "CURRENT INTERFACE"}
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
          <Icon name="shield" />A real recording in a disposable project.
          Checkpoints are observations, not proof of which action caused a
          change.
        </p>
      </div>
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
                src={import.meta.env.BASE_URL + "images/" + captured.image}
                width={captured.width}
                height={captured.height}
                alt={captured.alt}
              />
            </div>
            <p>
              Current interface, captured from the disposable recorded demo.{" "}
              <a
                href={import.meta.env.BASE_URL + "images/" + captured.image}
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

function HowItWorks() {
  return (
    <section
      className="container section how-section"
      id="how-it-works"
      aria-labelledby="how-title"
    >
      <div className="section-heading">
        <p className="eyebrow">A SMALL ADDITION TO YOUR WORKFLOW</p>
        <h2 id="how-title">Record. Inspect. Restore.</h2>
        <p>Keep using Git. Add the context around your agent’s work.</p>
      </div>
      <ol className="steps">
        {[
          [
            "Start a managed run",
            "Launch Codex through AgentTM, or use chat in the Windows desktop app.",
          ],
          [
            "Follow the activity",
            "Explore supported events and the workspace states observed near them.",
          ],
          [
            "Compare checkpoints",
            "Inspect historical files and diffs between captured states.",
          ],
          [
            "Restore separately",
            "Create an isolated Git worktree from an eligible checkpoint.",
          ],
        ].map(([title, text], i) => (
          <li key={title}>
            <span className="step-number">0{i + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <div className="safety-note">
        <Icon name="shield" />
        <p>
          Checkpoints are supported operation-boundary observations, not atomic
          snapshots. Restoring files does not rewind a Codex conversation.{" "}
          <a href={links.checkpoints}>
            Read the guarantees <span aria-hidden="true">↗</span>
          </a>
        </p>
      </div>
    </section>
  );
}

function GitComparison() {
  return (
    <section
      className="container section git-comparison"
      id="compare"
      aria-labelledby="comparison-title"
    >
      <div className="comparison-heading">
        <div>
          <p className="eyebrow">TWO PARTS OF THE SAME WORKFLOW</p>
          <h2 id="comparison-title">
            Git keeps the commits.
            <br />
            <span>AgentTM records the run.</span>
          </h2>
        </div>
        <p>
          Keep your commits, branches, and code reviews. Add a local record of
          supported Codex activity and the workspace states captured along the
          way.
        </p>
      </div>
      <div
        className="comparison-table-scroll"
        role="region"
        aria-label="Git and AgentTM feature comparison"
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">
            Built-in Git capabilities compared with the current AgentTM source
            build.
          </caption>
          <thead>
            <tr>
              <th scope="col">Your workflow</th>
              <th scope="col">
                <Icon name="branch" />
                Git
              </th>
              <th scope="col">
                <Icon name="timeline" />
                AgentTM
              </th>
            </tr>
          </thead>
          <tbody>
            {gitComparison.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td>{row.git}</td>
                <td>
                  <Icon name="check" />
                  <span>{row.agenttm}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="comparison-notes">
        <p>
          AgentTM captures supported operations in managed recordings. Workspace
          scans can be partial and are not atomic snapshots. Continuing a
          conversation does not rewind it to a restored checkpoint; exact
          action-to-line attribution is not available.
        </p>
        <p>
          Current source-build capabilities shown; published releases may
          differ.{" "}
          <a href={links.repo + "/blob/main/docs/comparison-with-git.md"}>
            Full comparison <Icon name="arrow" />
          </a>{" "}
          <a href="https://git-scm.com/docs/git-worktree">
            Git worktree documentation <Icon name="arrow" />
          </a>
        </p>
      </div>
    </section>
  );
}

export function CodeBlock({ command }: { command: string }) {
  const [result, setResult] = useState("");
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(""), 2200);
    return () => window.clearTimeout(timer);
  }, [result]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setResult("Copied");
    } catch {
      setResult("Select and copy the command manually");
    }
  }
  return (
    <div className="code-block">
      <span className="prompt" aria-hidden="true">
        $
      </span>
      <pre>
        <code>{command}</code>
      </pre>
      <button
        type="button"
        className="icon-button"
        aria-label={`Copy ${command}`}
        onClick={copy}
      >
        <Icon name={result === "Copied" ? "check" : "copy"} />
      </button>
      <span className="copy-feedback" role="status">
        {result}
      </span>
    </div>
  );
}

const docTabs = [
  "Quick start",
  "Requirements",
  "Desktop",
  "CLI",
  "Safety notes",
] as const;

function PlatformMark({ platform }: { platform: Platform }) {
  return (
    <svg
      className="platform-mark"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      {platform === "windows" ? (
        <>
          <path d="M2 5 11 3.8v8H2zM13 3.5 23 2v9.8H13zM2 13h9v8L2 19.7zM13 13h10v10L13 21.5z" />
        </>
      ) : platform === "macos" ? (
        <>
          <path d="M15.8 5.7c1-1.1 1.7-2.5 1.6-3.9-1.4.1-2.9.9-3.8 2-.8.9-1.5 2.3-1.4 3.7 1.4.1 2.8-.7 3.6-1.8ZM19 13c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8s-1.7-.8-2.8-.7c-1.4 0-2.8.8-3.5 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.4 2 2.5 1.9 1-.1 1.4-.6 2.7-.6s1.6.6 2.8.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.3Z" />
        </>
      ) : (
        <>
          <path
            d="M6 8 10 12 6 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 17h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="2"
            y="3"
            width="20"
            height="18"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </>
      )}
    </svg>
  );
}

function DocsInstall() {
  const [active, setActive] = useState(2);
  const [platform, setPlatform] = useState<Platform>("windows");
  const [mode, setMode] = useState<"desktop" | "cli">("desktop");
  const desktop = platform === "windows" && mode === "desktop";
  function choosePlatform(value: Platform) {
    setPlatform(value);
    if (value !== "windows") {
      setMode("cli");
      setActive(0);
    } else setActive(mode === "desktop" ? 2 : 0);
  }
  function chooseMode(value: "desktop" | "cli") {
    setMode(value);
    setActive(value === "desktop" ? 2 : 0);
  }
  const architecture = desktop
    ? "Intel / AMD 64-bit · Portable desktop preview"
    : platform === "macos"
      ? "Apple silicon & Intel · CLI + browser dashboard"
      : "amd64 & ARM64 · CLI + browser dashboard";
  const journey = desktop
    ? [
        [
          "download",
          "Choose the desktop ZIP",
          "Get the separate Windows desktop archive and SHA256SUMS from the same release.",
        ],
        [
          "shield",
          "Verify. Then extract.",
          "Compare the archive’s checksum before extracting. Keep both executables together.",
        ],
        [
          "chat",
          "Open your workspace",
          "Follow the Windows guide to launch AgentTM, select your project, and set up Codex.",
        ],
      ]
    : [
        [
          "download",
          "Choose your CLI archive",
          "Get the archive for your OS and architecture, its installer, and SHA256SUMS.",
        ],
        [
          "shield",
          "Verify and install",
          "Follow your platform guide to check the hash and install the CLI. Open a fresh terminal.",
        ],
        [
          "terminal",
          "Record your first session",
          "Initialize history in a Git project, check Codex, then run a small task and open the dashboard.",
        ],
      ];
  return (
    <section
      className="install-section section editorial-install"
      id="install"
      aria-labelledby="install-title"
    >
      <div className="container">
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
              <label
                key={key}
                className={platform === key ? "is-selected" : ""}
              >
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
          <div
            className="download-mode"
            role="group"
            aria-label="Application type"
          >
            <button
              type="button"
              aria-label="Desktop app"
              aria-pressed={desktop}
              disabled={platform !== "windows"}
              onClick={() => chooseMode("desktop")}
            >
              Desktop app <small>Windows</small>
            </button>
            <button
              type="button"
              aria-label="CLI and browser dashboard"
              aria-pressed={!desktop}
              onClick={() => chooseMode("cli")}
            >
              CLI + browser
            </button>
          </div>
          <div className="download-primary">
            <span className="download-ribbon">
              <i className="status-dot" />
              {desktop
                ? "NATIVE WINDOWS DESKTOP PREVIEW"
                : "ONE BINARY. YOUR LOCAL DASHBOARD."}
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
            Git 2.42+ · A Git project · Codex installed and authenticated for
            recording{desktop ? " · WebView2" : ""}
            <br />
            Go and Node.js are not required for prebuilt AgentTM binaries.
          </p>
        </div>
        <div className="install-journey">
          <div className="journey-heading">
            <span className="eyebrow">THREE STEPS. ONE LOCAL HISTORY.</span>
            <h3>
              {desktop
                ? "From download to desktop."
                : "From download to your first run."}
            </h3>
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
          <p>
            Pick a topic for the details. Desktop and CLI have separate setup
            paths.
          </p>
        </div>
        <div className="docs-shell">
          <aside className="docs-sidebar">
            <span className="docs-sidebar-heading">
              <Icon name="terminal" /> Getting started
            </span>
            <div
              role="tablist"
              aria-label="Installation topics"
              aria-orientation="horizontal"
            >
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
              {active === i && (
                <>
                  <div className="docs-breadcrumb">
                    Documentation <span>/</span> {title}
                  </div>
                  {i === 0 && (
                    <>
                      <h3>From your terminal to your timeline.</h3>
                      <p>
                        After installing the CLI and authenticating Codex, open
                        a terminal in your Git project. Run each command
                        separately.
                      </p>
                      <ol className="command-steps">
                        {commands.map((step, index) => (
                          <li key={step.command}>
                            <span className="command-number">{index + 1}</span>
                            <h4>{step.title}</h4>
                            <p>{step.detail}</p>
                            <CodeBlock command={step.command} />
                          </li>
                        ))}
                      </ol>
                      <p className="docs-footnote">
                        The native Windows app has its own setup path.{" "}
                        <button
                          className="inline-button"
                          type="button"
                          onClick={() => {
                            setActive(2);
                            document.getElementById("doc-tab-2")?.focus();
                          }}
                        >
                          Use desktop instead →
                        </button>
                      </p>
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <h3>A few things before your first run.</h3>
                      <p>
                        AgentTM builds on the tools already in your workflow.
                      </p>
                      <ul className="requirements">
                        <li>
                          <Icon name="check" />
                          <div>
                            <strong>Git 2.42+ and a Git working tree</strong>
                            <p>
                              Use an existing Git project, or a disposable
                              repository for your first test.
                            </p>
                          </div>
                        </li>
                        <li>
                          <Icon name="check" />
                          <div>
                            <strong>
                              Installed and authenticated Codex CLI
                            </strong>
                            <p>
                              Required for new recordings. Check setup with{" "}
                              <code>agenttm codex doctor</code>.
                            </p>
                          </div>
                        </li>
                        <li>
                          <Icon name="check" />
                          <div>
                            <strong>
                              The binary for your operating system
                            </strong>
                            <p>
                              Windows desktop is a separate amd64 ZIP. CLI
                              archives support Windows, macOS, and Linux.
                            </p>
                          </div>
                        </li>
                        <li>
                          <Icon name="check" />
                          <div>
                            <strong>WebView2 for Windows desktop</strong>
                            <p>
                              The native preview uses Microsoft Edge WebView2
                              Evergreen Runtime.
                            </p>
                          </div>
                        </li>
                      </ul>
                      <p>
                        Go and Node.js are not needed to run prebuilt AgentTM
                        releases. Codex has its own installation prerequisites.
                      </p>
                    </>
                  )}
                  {i === 2 && (
                    <>
                      <h3>A native window for your local history.</h3>
                      <p>
                        The Windows desktop preview includes interactive Codex
                        chat, saved conversation continuation, and history
                        backup tools.
                      </p>
                      <ol className="prose-steps">
                        <li>
                          Download the separate{" "}
                          <code>agenttm-desktop_VERSION_windows_amd64.zip</code>{" "}
                          and <code>SHA256SUMS</code> from the same release.
                        </li>
                        <li>
                          Follow the Windows guide to verify the archive, then
                          extract it. Keep <code>AgentTM.exe</code> and{" "}
                          <code>agenttm-cli.exe</code> together.
                        </li>
                        <li>
                          Follow the launch steps for your release. Newer source
                          builds include a project picker; older releases may
                          need a project-directory launch. Check the guide and
                          release notes.
                        </li>
                      </ol>
                      <div className="docs-callout">
                        Requires Git and WebView2. The preview is unsigned;
                        Windows reputation warnings may occur. There is no
                        native macOS or Linux desktop release.
                      </div>
                      <a
                        className="button button-secondary"
                        href={platforms.windows.href}
                      >
                        Windows desktop guide <Icon name="arrow" />
                      </a>
                    </>
                  )}
                  {i === 3 && (
                    <>
                      <h3>One binary. A local browser dashboard.</h3>
                      <p>
                        Choose your platform’s CLI archive from the release
                        Assets. The compiled React dashboard is embedded in the
                        executable.
                      </p>
                      <ol className="prose-steps">
                        <li>
                          Download one matching CLI archive, its platform
                          installer, and <code>SHA256SUMS</code> from the same
                          release.
                        </li>
                        <li>
                          Verify the checksum and follow the platform guide. Do
                          not use the CLI installer with a desktop ZIP.
                        </li>
                        <li>
                          Open a fresh terminal after changing PATH, then check
                          your installation.
                        </li>
                      </ol>
                      <CodeBlock command="agenttm version" />
                      <CodeBlock command="agenttm doctor" />
                      <p>
                        <code>doctor</code> checks project storage; run it
                        inside an initialized Git project.
                      </p>
                      <div className="platform-guides">
                        {Object.entries(platforms).map(([key, value]) => (
                          <a href={value.href} key={key}>
                            {value.label} guide{" "}
                            <span aria-hidden="true">↗</span>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  {i === 4 && (
                    <>
                      <h3>Local history. Clear boundaries.</h3>
                      <ul className="safety-list">
                        <li>
                          Only AgentTM-managed Codex sessions are captured.
                          External runs are not automatically recorded.
                        </li>
                        <li>
                          Checkpoints can be partial and are not atomic.
                          Recorded activity does not establish exact causal line
                          attribution.
                        </li>
                        <li>
                          Snapshot file bytes are not content-redacted. Review
                          exclusions and your data before exporting or sharing
                          history.
                        </li>
                        <li>
                          AgentTM history stays local. Codex communicates with
                          its configured service; this is not offline inference.
                        </li>
                        <li>
                          Restoration recovers eligible files into an isolated
                          Git worktree. It does not reproduce AI reasoning or
                          rewind a conversation.
                        </li>
                      </ul>
                      <a className="text-link" href={links.checkpoints}>
                        Checkpoint guarantees <Icon name="arrow" />
                      </a>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section
      className="container section feature-section"
      aria-labelledby="feature-title"
    >
      <div className="section-heading">
        <p className="eyebrow">BUILT FOR THE INVESTIGATION</p>
        <h2 id="feature-title">The details that keep history useful.</h2>
        <p>
          A local index, shared file content, and explicit tools to manage what
          you keep.
        </p>
      </div>
      <div className="feature-grid">
        {features.map((feature, index) => (
          <article
            key={feature.title}
            className={`feature-card feature-card-${index}`}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              const box = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty(
                "--pointer-x",
                `${event.clientX - box.left}px`,
              );
              event.currentTarget.style.setProperty(
                "--pointer-y",
                `${event.clientY - box.top}px`,
              );
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
        Feature availability depends on the selected release.{" "}
        <a href={links.releases}>Check release notes and assets ↗</a>
      </p>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="final-cta" aria-labelledby="final-title">
      <div className="container">
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          width="52"
          height="52"
          alt=""
        />
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

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Brand />
          <nav aria-label="Footer">
            <a href={links.repo}>GitHub</a>
            <a href={links.releases}>Releases</a>
            <a href={links.docs}>Documentation</a>
            <a href={links.license}>License</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} AgentTM. All rights reserved.</p>
          <p>Public repository · Proprietary license</p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <MotionProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div id="top" />
      <SiteHeader />
      <main id="main">
        <Hero />
        <Reveal>
          <ProblemSection />
        </Reveal>
        <Reveal>
          <FeatureShowcase />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
        <Reveal>
          <GitComparison />
        </Reveal>
        <Reveal>
          <FeatureGrid />
        </Reveal>
        <Reveal>
          <DocsInstall />
        </Reveal>
        <Reveal>
          <FinalCTA />
        </Reveal>
      </main>
      <SiteFooter />
    </MotionProvider>
  );
}
