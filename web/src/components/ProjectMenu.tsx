import { DialogClose } from "./DialogClose";
import { useEffect, useRef, useState } from "react";
import { message } from "../api";

type ProjectBridge = {
  ProjectPath?: () => Promise<string>;
  CheckSetup?: () => Promise<{ path?: string }>;
  CopyText?: (text: string) => Promise<void>;
  OpenProjectWindow?: () => Promise<boolean>;
};
function ProjectIcon({
  kind,
}: {
  kind: "folder" | "copy" | "open" | "close" | "chevron";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "folder" && <path d="M3 7V5h6l2 2h10v13H3V7Z" />}
      {kind === "copy" && (
        <>
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8V3H3v13h5" />
        </>
      )}
      {kind === "open" && (
        <>
          <rect x="3" y="6" width="14" height="15" rx="2" />
          <path d="M10 14 21 3M14 3h7v7" />
        </>
      )}
      {kind === "close" && <path d="m6 6 12 12M18 6 6 18" />}
      {kind === "chevron" && <path d="m8 10 4 4 4-4" />}
    </svg>
  );
}
export function ProjectMenu({
  project,
  compact = false,
}: {
  project: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const [pathError, setPathError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"" | "copy" | "choose">("");
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const bridge = window.go?.main?.Desktop as ProjectBridge | undefined;
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      requestAnimationFrame(() =>
        opener.current?.focus({ preventScroll: true }),
      );
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setPath("");
    setPathError("");
    if (!bridge?.ProjectPath && !bridge?.CheckSetup) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.resolve()
      .then(async () => {
        const value = bridge.ProjectPath
          ? await bridge.ProjectPath()
          : (await bridge.CheckSetup!()).path;
        if (!value?.trim())
          throw new Error(
            "The current project path could not be read. Try again.",
          );
        if (active) setPath(value);
      })
      .catch((reason) => {
        if (active) setPathError(message(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, retry]);
  function show() {
    setNotice("");
    setError("");
    setOpen(true);
  }
  function close() {
    if (!pending.current) setOpen(false);
  }
  async function choose() {
    if (!bridge?.OpenProjectWindow || pending.current) return;
    pending.current = true;
    setAction("choose");
    setError("");
    setNotice("");
    try {
      const launched = await bridge.OpenProjectWindow();
      setNotice(
        launched
          ? "A new AgentTM window was requested. Complete any initialization prompt there."
          : "No project selected. Your current workspace is unchanged.",
      );
    } catch (reason) {
      setError(message(reason));
    } finally {
      pending.current = false;
      setAction("");
    }
  }
  async function copy() {
    if (!path || pending.current) return;
    pending.current = true;
    setAction("copy");
    setError("");
    setNotice("");
    try {
      if (bridge?.CopyText) await bridge.CopyText(path);
      else await navigator.clipboard.writeText(path);
      setNotice("Project path copied.");
    } catch (reason) {
      setError(message(reason));
    } finally {
      pending.current = false;
      setAction("");
    }
  }
  return (
    <>
      <button
        ref={opener}
        className="sidebar-project project-selector"
        onClick={show}
        aria-label="Project selector"
        title={compact ? undefined : `${project} - project options`}
        data-sidebar-tooltip={`${project} · Project options`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="project-avatar" aria-hidden="true">
          {project.slice(0, 1).toUpperCase()}
        </span>
        <span>
          <span className="eyebrow">PROJECT</span>
          <strong>{project}</strong>
        </span>
        <span className="project-chevron">
          <ProjectIcon kind="chevron" />
        </span>
      </button>
      <dialog
        ref={dialog}
        className="project-dialog editorial-project-dialog"
        aria-labelledby="project-title"
        aria-describedby="project-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          if (!pending.current) setOpen(false);
        }}
      >
        <header className="project-dialog-heading">
          <div>
            <span className="eyebrow">PROJECT</span>
            <h2 id="project-title">Your workspace</h2>
          </div>
          <DialogClose
            label="Close project selector"
            onClick={close}
            disabled={!!action}
          />
        </header>
        <section className="project-current" aria-label="Current project">
          <div className="project-current-identity">
            <ProjectIcon kind="folder" />
            <div>
              <h3>{project}</h3>
              <p id="project-dialog-description">
                The project open in this window.
              </p>
            </div>
          </div>
          {loading && (
            <p className="project-path-status" role="status">
              Reading project location...
            </p>
          )}
          {path && (
            <div className="project-location">
              <code>{path}</code>
              <button
                onClick={copy}
                disabled={!!action}
                aria-label="Copy project path"
                title="Copy project path"
              >
                <ProjectIcon kind="copy" />
              </button>
            </div>
          )}
          {pathError && (
            <div className="project-path-error" role="alert">
              <p>{pathError}</p>
              <button onClick={() => setRetry((value) => value + 1)}>
                Retry project path
              </button>
            </div>
          )}
          {!loading && !pathError && !path && (
            <p className="project-path-status">
              The project location is available in the native desktop app.
            </p>
          )}
        </section>
        <section className="project-switch-info">
          <h3>Open another project</h3>
          <p>
            {bridge?.OpenProjectWindow
              ? "Choose a Git folder to open in a separate window. This workspace and any active recording stay here."
              : "Run the following command from another Git project's terminal to open its browser dashboard."}
          </p>
          {!bridge?.OpenProjectWindow && (
            <code className="project-browser-command">agenttm ui</code>
          )}
          {bridge?.OpenProjectWindow && (
            <button
              className="primary-button project-choose"
              disabled={!!action}
              onClick={choose}
            >
              <ProjectIcon kind="open" />
              {action === "choose"
                ? "Choosing project..."
                : "Choose a Git project..."}
            </button>
          )}
        </section>
        {notice && (
          <p className="project-feedback" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="project-action-error" role="alert">
            {error}
          </p>
        )}
        <footer className="project-dialog-footer">
          Opening another project does not move your current recording or
          history.
        </footer>
      </dialog>
    </>
  );
}
