import { useEffect, useState } from "react";
import { get } from "../api";
import { changedPaths, eventTitle, record } from "../state";
import type { Health, Page, RecordedEvent, Session } from "../types";
import type { AppPage } from "./NavigationPages";

type IconName =
  | "home"
  | "session"
  | "chat"
  | "book"
  | "checkpoint"
  | "restore"
  | "arrow"
  | "folder"
  | "clock";
function HomeIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
      </>
    ),
    session: (
      <>
        <path d="M7 3h9l4 4v14H7zM16 3v5h4M10 12h7M10 16h5M4 6v12" />
      </>
    ),
    chat: (
      <>
        <path d="M4 4h16v12H9l-5 4V4ZM8 8h8M8 12h5" />
      </>
    ),
    book: (
      <>
        <path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v15" />
      </>
    ),
    checkpoint: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    restore: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="5" r="2" />
        <path d="M6 7v10M18 7v1a6 6 0 0 1-6 6H6" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    folder: <path d="M3 6h6l2 2h10v12H3V6Z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
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
      {paths[name]}
    </svg>
  );
}

function SessionCard({
  session,
  project,
  onOpen,
  onRename,
  canRename,
}: {
  session: Session;
  project: string;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  canRename: boolean;
}) {
  const [lines, setLines] = useState<{ kind: string; text: string }[] | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const fallback =
    session.title ||
    `${session.agent === "codex" ? "Codex" : session.agent} session`;
  const [heading, setHeading] = useState(fallback);
  useEffect(() => {
    const controller = new AbortController();
    setHeading(fallback);
    get<Page<RecordedEvent>>(
      "/sessions/" + session.id + "/events?limit=12",
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted) {
          setFailed(false);
          // Use only the first persisted user prompt. Do not derive a title from
          // agent output or read prompt text from Codex's private history.
          const firstPrompt = page.items.find(
            (event) =>
              event.kind === "agenttm.chat.prompt" ||
              event.kind === "agenttm.run.started",
          );
          const payload = record(firstPrompt?.payload);
          const prompt =
            firstPrompt?.kind === "agenttm.chat.prompt"
              ? payload.text
              : payload.prompt;
          const text =
            typeof prompt === "string"
              ? prompt.replace(/\s+/g, " ").trim()
              : "";
          setHeading(
            session.title
              ? session.title
              : text &&
                  !/^\[(?:prompt.*(?:off|omitted)|redacted)\]$/i.test(text)
                ? text.slice(0, 120) + (text.length > 120 ? "…" : "")
                : fallback,
          );
          const activity = page.items.filter(
            (event) =>
              event.kind !== "agenttm.chat.prompt" &&
              event.kind !== "agenttm.run.started",
          );
          const detailed = activity.filter((event) => {
            const item = record(record(event.payload).item);
            return (
              typeof item.command === "string" ||
              typeof item.text === "string" ||
              changedPaths(event).length > 0
            );
          });
          setLines(
            (detailed.length ? detailed : activity)
              .slice(0, 3)
              .map((event) => ({
                kind: event.kind.replace("agenttm.", "").replaceAll(".", " / "),
                text: (
                  changedPaths(event).join(", ") || eventTitle(event)
                ).slice(0, 120),
              })),
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [session.id, session.status, fallback]);
  return (
    <article className="home-session-tile">
      <button
        className={"home-session-card home-session-" + session.status}
        onClick={() => onOpen(session.id)}
        aria-label={`Open session ${session.id.slice(0, 8)}`}
      >
        <h2 title={session.title || heading}>{session.title || heading}</h2>
        <div className="home-card-project">
          <span className="home-document-icon">
            <HomeIcon name="session" />
          </span>
          <span>{project}</span>
        </div>
        <div className="home-recording-page">
          <div className="home-paper-date">
            {new Date(session.started_at).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {failed ? (
            <p className="home-preview-notice">
              Preview unavailable. Open this session to inspect its history.
            </p>
          ) : lines === null ? (
            <p className="home-preview-notice">Loading recorded activity…</p>
          ) : !lines.length ? (
            <p className="home-preview-notice">No recorded events yet.</p>
          ) : (
            lines.map((line, i) => (
              <div className="home-preview-entry" key={i}>
                <strong>{line.kind}</strong>
                <p>{line.text}</p>
              </div>
            ))
          )}
        </div>
        <div className="home-card-bottom">
          <span className={"home-session-status " + session.status}>
            <span />
            {session.status.replaceAll("_", " ")}
          </span>
          <span className="home-view-session">
            View session
            <HomeIcon name="arrow" />
          </span>
        </div>
      </button>
      <button
        className="home-rename-session"
        title="Name this session"
        aria-label={`Rename session ${session.id.slice(0, 8)}`}
        disabled={!canRename}
        onClick={() => onRename(session.id)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z" />
        </svg>
      </button>
    </article>
  );
}

export function Overview({
  sessions,
  health,
  more,
  onOpen,
  navigate,
  onRename,
}: {
  sessions: Session[];
  health: Health | null;
  more: boolean;
  onOpen: (id: string) => void;
  navigate: (page: AppPage) => void;
  onRename: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"recent" | "active" | "completed">(
    "recent",
  );
  const desktopChat =
    !!window.go?.main?.Desktop && "StartChat" in window.go.main.Desktop;
  const filtered = sessions.filter(
    (session) => filter === "recent" || session.status === filter,
  );
  const recent = [...filtered]
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))
    .slice(0, 8);
  return (
    <div className="page-scroll home-overview">
      <header className="home-heading">
        <div>
          <h1>Overview</h1>
        </div>
        <div className="home-actions">
          <button
            className="home-new"
            onClick={() => navigate(desktopChat ? "chat" : "setup")}
          >
            <HomeIcon name="chat" />
            {desktopChat ? "New conversation" : "Set up recording"}
          </button>
          <button className="home-guide" onClick={() => navigate("setup")}>
            <HomeIcon name="book" />
            Recording guide
          </button>
        </div>
      </header>

      <div className="home-library-heading">
        <div
          className="home-filters"
          role="tablist"
          aria-label="Recent session filter"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const values = ["recent", "active", "completed"] as const;
            const index = values.indexOf(filter);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 2
                  : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
            setFilter(values[next]);
            event.currentTarget
              .querySelectorAll<HTMLButtonElement>("button")
              [next].focus();
          }}
        >
          {(["recent", "active", "completed"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              tabIndex={filter === value ? 0 : -1}
              onClick={() => setFilter(value)}
            >
              {value === "recent"
                ? "Recents"
                : value === "active"
                  ? "Active"
                  : "Completed"}
            </button>
          ))}
        </div>
        <button className="home-view-all" onClick={() => navigate("sessions")}>
          All sessions
          <HomeIcon name="arrow" />
        </button>
      </div>

      <section className="home-library" aria-label="Recent sessions">
        {recent.length ? (
          <div className="home-session-grid">
            {recent.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                project={health?.project || "Current project"}
                onOpen={onOpen}
                onRename={onRename}
                canRename={!!health?.csrf_token}
              />
            ))}
          </div>
        ) : (
          <div className="home-empty">
            <span className="home-empty-icon">
              <HomeIcon name="session" />
            </span>
            <h2>
              {sessions.length
                ? "No " + filter + " sessions in loaded history"
                : "Your history starts with a run"}
            </h2>
            <p>
              {sessions.length
                ? "Choose Recents to browse your other recordings."
                : "Set up Codex, start a conversation, and your recordings will appear here."}
            </p>
            <button
              onClick={() =>
                sessions.length
                  ? setFilter("recent")
                  : navigate(desktopChat ? "chat" : "setup")
              }
            >
              {sessions.length
                ? "Show recents"
                : desktopChat
                  ? "Start a conversation"
                  : "Set up recording"}
              <HomeIcon name="arrow" />
            </button>
          </div>
        )}
        {filtered.length > 8 || more ? (
          <button className="home-more" onClick={() => navigate("sessions")}>
            Browse more sessions
            <HomeIcon name="arrow" />
          </button>
        ) : null}
      </section>

      <footer className="home-footer">
        <span>
          <span className="status-dot" />
          History stored on this device
        </span>
        <span>
          {health?.prompt_mode === "sanitized"
            ? "Sanitized prompt capture enabled"
            : "Prompt text capture off"}
        </span>
        <span>
          {sessions.length}
          {more ? "+" : ""} loaded sessions
        </span>
      </footer>
    </div>
  );
}
