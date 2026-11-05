import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { get, message } from "../api";
import { historyDate, plural } from "../history-presentation";
import type { Page, RestoredWorkspace } from "../types";
import { NavIcon } from "./NavigationPages";

type FolderState = { state: string; checked_at: string; message: string };
type RestoreBridge = {
  CopyText?: (value: string) => Promise<void>;
  CheckRestoredWorkspace?: (id: string) => Promise<FolderState>;
  OpenRestoredWorkspace?: (id: string) => Promise<void>;
};
const identity = (item: RestoredWorkspace) =>
  item.worktree_path.split(/[\\/]/).filter(Boolean).at(-1) ||
  item.branch_name ||
  item.id.slice(0, 8);
const date = (value: string) =>
  value && Number.isFinite(Date.parse(value))
    ? historyDate(value)
    : "Not recorded";
const resultLabel = (status: string) =>
  ({ ready: "Completed", restoring: "Restoring", failed: "Failed" })[status] ||
  status.replaceAll("_", " ") ||
  "Not recorded";
function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7V4h7l2 3h9v13H3V7Z" />
      <path d="M3 8h18" />
    </svg>
  );
}

export function RestoredWorkspaces({
  revision,
  onCheckpoints,
  onInspect,
}: {
  revision: number;
  onCheckpoints: () => void;
  onInspect: (checkpoint: string) => Promise<void>;
}) {
  const [items, setItems] = useState<RestoredWorkspace[]>([]),
    [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true),
    [moreBusy, setMoreBusy] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState("newest"),
    [selected, setSelected] = useState("");
  const [drawer, setDrawer] = useState(false),
    [narrow, setNarrow] = useState(
      () => matchMedia("(max-width:1100px)").matches,
    );
  const [folder, setFolder] = useState<FolderState | null>(null),
    [checking, setChecking] = useState(false),
    [action, setAction] = useState(""),
    [feedback, setFeedback] = useState(""),
    [actionError, setActionError] = useState("");
  const generation = useRef(0),
    selection = useRef(selected),
    rows = useRef<HTMLDivElement>(null);
  selection.current = selected;
  const bridge = window.go?.main?.Desktop as RestoreBridge | undefined;
  useEffect(() => {
    const media = matchMedia("(max-width:1100px)");
    const update = () => {
      setNarrow(media.matches);
      setDrawer(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const run = ++generation.current;
    setLoading(true);
    setMoreBusy(false);
    setError("");
    get<Page<RestoredWorkspace>>("/forks", controller.signal)
      .then((page) => {
        if (!controller.signal.aborted && generation.current === run) {
          setItems(page.items);
          setCursor(page.next_cursor);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, retry]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items
      .filter((item) =>
        [
          identity(item),
          item.branch_name,
          item.worktree_path,
          item.checkpoint_id,
          resultLabel(item.status),
        ].some((text) => text.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        if (sort === "name") return identity(a).localeCompare(identity(b));
        if (sort === "result")
          return (
            resultLabel(a.status).localeCompare(resultLabel(b.status)) ||
            a.id.localeCompare(b.id)
          );
        return (
          ((Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0)) *
            (sort === "oldest" ? 1 : -1) || a.id.localeCompare(b.id)
        );
      });
  }, [items, search, sort]);
  useEffect(() => {
    if (!visible.some((item) => item.id === selected))
      setSelected(visible[0]?.id || "");
  }, [visible, selected]);
  const item = visible.find((value) => value.id === selected);
  useLayoutEffect(() => {
    setFolder(null);
    setFeedback("");
    setActionError("");
    setChecking(false);
    setAction("");
  }, [selected]);
  async function checkFolder() {
    if (!item || !bridge?.CheckRestoredWorkspace) return;
    const id = item.id;
    setChecking(true);
    setActionError("");
    try {
      const result = await bridge.CheckRestoredWorkspace(id);
      if (selection.current === id) setFolder(result);
    } catch (e) {
      if (selection.current === id) setActionError(message(e));
    } finally {
      if (selection.current === id) setChecking(false);
    }
  }
  async function perform(kind: "copy" | "open" | "inspect") {
    if (!item || action) return;
    const id = item.id;
    setAction(kind);
    setFeedback("");
    setActionError("");
    try {
      if (kind === "copy") {
        if (bridge?.CopyText) await bridge.CopyText(item.worktree_path);
        else await navigator.clipboard.writeText(item.worktree_path);
        if (selection.current === id) setFeedback("Workspace path copied.");
      }
      if (kind === "inspect") await onInspect(item.checkpoint_id);
      if (kind === "open" && bridge?.OpenRestoredWorkspace) {
        await bridge.OpenRestoredWorkspace(id);
        if (selection.current === id)
          setFeedback("File Explorer launch requested.");
      }
    } catch (e) {
      if (selection.current === id) setActionError(message(e));
    } finally {
      if (selection.current === id) setAction("");
    }
  }
  async function more() {
    if (cursor === null || moreBusy) return;
    const run = generation.current;
    setMoreBusy(true);
    setError("");
    try {
      const page = await get<Page<RestoredWorkspace>>(
        "/forks?cursor=" + cursor,
      );
      if (generation.current === run) {
        setItems((old) => [
          ...old,
          ...page.items.filter(
            (item) => !old.some((value) => value.id === item.id),
          ),
        ]);
        setCursor(page.next_cursor);
      }
    } catch (e) {
      if (generation.current === run) setError(message(e));
    } finally {
      if (generation.current === run) setMoreBusy(false);
    }
  }
  function close() {
    setDrawer(false);
    requestAnimationFrame(() =>
      rows.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.focus(),
    );
  }
  return (
    <section
      className="restore-manager"
      aria-label="Restored workspace manager"
      onKeyDown={(e) => {
        if (e.key === "Escape" && narrow && drawer) {
          e.preventDefault();
          close();
        }
      }}
    >
      <header className="restores-heading">
        <div>
          <span className="editorial-kicker">SEPARATE WORKING COPIES</span>
          <h1>Restored workspaces</h1>
          <p>
            Find a restored workspace, inspect its source, and pick up where you
            need to.
          </p>
        </div>
        <button onClick={onCheckpoints}>
          <NavIcon name="sessions" />
          Browse history
        </button>
      </header>
      <div className="restores-controls">
        <label className="restores-search">
          <NavIcon name="search" />
          <input
            aria-label="Search restored workspaces"
            placeholder="Find a workspace…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="restores-sort">
          Sort
          <select
            aria-label="Sort restored workspaces"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name</option>
            <option value="result">Restore result</option>
          </select>
        </label>
      </div>
      {error && (
        <div className="restores-error" role="alert">
          {error}
          <button
            disabled={loading}
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      )}
      <div className="restores-body">
        <div className="restores-list-pane">
          {loading && !items.length ? (
            <div className="restores-empty" role="status">
              <FolderIcon />
              <h2>Loading your workspaces…</h2>
            </div>
          ) : !items.length && !error ? (
            <div className="restores-empty">
              <FolderIcon />
              <h2>No restored workspaces yet</h2>
              <p>
                Inspect a checkpoint in History, then restore it to create a
                separate Git worktree.
              </p>
              <button className="primary-button" onClick={onCheckpoints}>
                Browse checkpoints
              </button>
            </div>
          ) : !visible.length && !error ? (
            <div className="restores-empty">
              <NavIcon name="search" />
              <h2>No matching workspaces</h2>
              <p>Search a folder name, path, branch, or checkpoint.</p>
              <button onClick={() => setSearch("")}>Clear search</button>
            </div>
          ) : (
            <>
              <div className="restores-columns" aria-hidden="true">
                <span>Workspace</span>
                <span>Restored</span>
                <span>Checkpoint</span>
                <span>Restore result</span>
              </div>
              <div
                className="restores-list"
                role="listbox"
                aria-label="Restored workspaces"
                ref={rows}
                aria-busy={loading}
              >
                {visible.map((workspace, index) => (
                  <button
                    key={workspace.id}
                    role="option"
                    aria-label={"Workspace " + identity(workspace)}
                    aria-selected={selected === workspace.id}
                    tabIndex={selected === workspace.id ? 0 : -1}
                    className="restores-row"
                    onClick={() => {
                      setSelected(workspace.id);
                      setDrawer(narrow);
                    }}
                    onKeyDown={(e) => {
                      if (
                        !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
                      )
                        return;
                      e.preventDefault();
                      const next =
                        e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? visible.length - 1
                            : Math.max(
                                0,
                                Math.min(
                                  visible.length - 1,
                                  index + (e.key === "ArrowDown" ? 1 : -1),
                                ),
                              );
                      setSelected(visible[next].id);
                      rows.current
                        ?.querySelectorAll<HTMLElement>("[role=option]")
                        [next]?.focus();
                    }}
                  >
                    <span className="restore-row-identity">
                      <FolderIcon />
                      <span>
                        <strong>{identity(workspace)}</strong>
                        <small>Isolated Git worktree</small>
                      </span>
                    </span>
                    <time dateTime={workspace.created_at || undefined}>
                      {date(workspace.created_at)}
                    </time>
                    <code className="restore-source">
                      {workspace.checkpoint_id.slice(0, 8) || "Not recorded"}
                    </code>
                    <span
                      className={"restore-result result-" + workspace.status}
                    >
                      <i aria-hidden="true" />
                      {resultLabel(workspace.status)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {cursor !== null && (
            <button
              className="restores-more"
              disabled={loading || moreBusy}
              onClick={more}
            >
              {moreBusy ? "Loading…" : "Load more workspaces"}
            </button>
          )}
          <p className="restores-scope">
            {visible.length}
            {cursor !== null ? "+" : ""}{" "}
            {plural(
              visible.length === 1 && cursor === null ? 1 : 2,
              "workspace",
            )}{" "}
            shown
            {cursor !== null ? " · search and sort cover loaded records" : ""}
          </p>
        </div>
        {item && (!narrow || drawer) && (
          <aside
            className={"restores-details " + (narrow ? "restores-drawer" : "")}
            aria-label="Selected workspace details"
          >
            <div className="restores-details-heading">
              <FolderIcon />
              <div>
                <span className="editorial-kicker">SELECTED WORKSPACE</span>
                <h2>{identity(item)}</h2>
              </div>
              {narrow && (
                <button aria-label="Close workspace details" onClick={close}>
                  ×
                </button>
              )}
            </div>
            <div className={"restore-result result-" + item.status}>
              <i aria-hidden="true" />
              {resultLabel(item.status)} <span>· recorded result</span>
            </div>
            <div className="restores-detail-actions">
              <button
                disabled={!!action || !item.worktree_path}
                onClick={() => perform("copy")}
              >
                {action === "copy" ? "Copying…" : "Copy path"}
              </button>
              <button
                disabled={!!action || !item.checkpoint_id}
                onClick={() => perform("inspect")}
              >
                {action === "inspect"
                  ? "Opening source…"
                  : "Inspect source checkpoint"}
              </button>
              <button
                className="primary-button"
                disabled={
                  !bridge?.OpenRestoredWorkspace ||
                  !!action ||
                  (!!folder && folder.state !== "available")
                }
                onClick={() => perform("open")}
              >
                {action === "open" ? "Opening…" : "Open folder"}
              </button>
            </div>
            {!bridge?.OpenRestoredWorkspace && (
              <p className="restore-browser-note">
                Copy this path to open it in your file manager or editor.
                Opening folders here requires the updated Windows desktop app.
              </p>
            )}
            {feedback && (
              <p className="restore-feedback" role="status">
                {feedback}
              </p>
            )}
            {actionError && (
              <div className="restores-error" role="alert">
                {actionError}
              </div>
            )}
            <dl>
              <dt>Folder location</dt>
              <dd className="restore-full-path">
                {item.worktree_path || "Not recorded"}
              </dd>
              <dt>Git branch</dt>
              <dd>
                <code>{item.branch_name || "Not recorded"}</code>
              </dd>
              <dt>Source checkpoint</dt>
              <dd>
                <button
                  className="restore-source-link"
                  disabled={!item.checkpoint_id || !!action}
                  onClick={() => perform("inspect")}
                >
                  {item.checkpoint_id || "Not recorded"}{" "}
                  <span aria-hidden="true">↗</span>
                </button>
              </dd>
              <dt>Restoration recorded</dt>
              <dd>{date(item.created_at)}</dd>
            </dl>
            <div className="restore-live-check">
              <div>
                <h3>Folder availability</h3>
                {bridge?.CheckRestoredWorkspace && (
                  <button disabled={checking || !!action} onClick={checkFolder}>
                    {checking
                      ? "Checking…"
                      : folder
                        ? "Check again"
                        : "Check folder"}
                  </button>
                )}
              </div>
              {folder ? (
                <>
                  <p className={"folder-state folder-" + folder.state}>
                    {{
                      available: "Folder accessible",
                      missing: "Folder not found",
                      inaccessible: "Folder inaccessible",
                      blocked: "Folder access blocked",
                    }[folder.state] || "Not confirmed"}
                  </p>
                  <p>{folder.message}</p>
                  <small>Checked {date(folder.checked_at)}</small>
                </>
              ) : (
                <p>
                  {bridge?.CheckRestoredWorkspace
                    ? "Not checked. The saved restore result does not confirm its current condition."
                    : "Live folder checks are available in the updated Windows desktop app."}
                </p>
              )}
            </div>
            <p className="restore-safety-note">
              Restore results describe the original operation, not live Git
              health. Your original working tree, index, and HEAD stay in place.
              Restoring does not rewind the Codex conversation.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
}
