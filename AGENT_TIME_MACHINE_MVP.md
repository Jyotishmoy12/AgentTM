# Agent Time Machine (AgentTM)
## Implementation-ready MVP specification — Codex-first

**Status:** Proposed v0.1 (Codex-first) | **Date:** 2026-11-02 | **Primary language:** Go | **Interface:** local web UI (React + TypeScript)

> **Implementation directive:** Build a working, local-first developer tool, not a mockup. Implement vertical slices in the order specified below. Do not silently substitute a simulation for actual event capture or checkpoint restoration. Where an agent integration is unsupported, expose that limitation clearly.

---

## 1. Product definition

AgentTM records observable coding-agent activity and repository states so developers can inspect **what the agent did, what files changed, and when**, restore a historical workspace in isolation, and optionally start a new agent session from a checkpoint.

The product is **not** a deterministic replay of model internals, a general runtime debugger, or a claim to reveal private chain-of-thought. It records observable tool events, user prompts where available, workspace diffs, and tool outcomes. **Replay** in v0.1 means historical inspection and workspace restoration; **continuation** means starting a new agent session with best-effort context, not resuming identical hidden model state.

### 1.1 Target users and scenarios

- A developer using OpenAI Codex CLI in an existing Git repository wants to see each edit and command in order.
- A developer wants to inspect the codebase immediately after a specific tool execution.
- A developer wants to fork an older state without modifying the current working tree.
- A developer wants to correlate a file change with the agent action that likely caused it.

### 1.2 MVP acceptance outcomes

1. User downloads one AgentTM executable and runs `agenttm init` inside an existing Git repository.
2. User runs `agenttm run codex -- "<task>"`, which launches a **real Codex CLI execution** with supported structured event output.
3. AgentTM records that Codex run, including available tool/event metadata and before/after workspace checkpoints, and displays it in `agenttm ui`.
4. AgentTM captures **post-tool** workspace state and creates retrievable checkpoints when tracked or eligible untracked files change.
5. Timeline displays event type, timestamp, tool name, sanitized inputs/outputs, changed paths, and linked checkpoint.
6. User selects any checkpoint and views file tree, diff from parent, and file contents.
7. User selects **Fork checkpoint**, and AgentTM creates a separate Git worktree with the checkpoint state, leaving the original repository untouched.
8. The CLI works on Windows, macOS, and Linux (CI smoke tests), with the first development environment allowed to be Windows.
9. No cloud account or remote backend is required.

### 1.3 Explicitly out of scope for v0.1

Claude Code adapter; automatic capture of arbitrary existing interactive Codex sessions; native VS Code extension; cloud sync; team accounts; deterministic replay; automatic recovery of process memory, external databases, environment, or network side effects; model internal reasoning; complete shell command tracing; remote repository hosting; multi-agent coordination; containerized sandboxes; automated agent continuation.

**Future v0.2:** Claude Code hooks, optional interactive Codex session capture if officially supported, and an explicit `agenttm continue <checkpoint>` workflow using supported session-fork APIs where available, otherwise a fresh session with reconstructed observable context.

---

## 2. Developer experience

The following are **commands to implement**, not commands that currently exist:

```sh
# Download/release-install agenttm executable, then:
cd path/to/existing-git-repo
agenttm init
agenttm run codex -- "Implement a small feature"  # launches real Codex via CLI
# Initial MVP records agenttm-managed non-interactive Codex runs
agenttm sessions
agenttm ui                 # opens local browser UI
agenttm checkpoints <session-id>
agenttm fork <checkpoint-id> --name alternative-auth
agenttm codex doctor
```

### 2.1 Initialization contract

- Refuse non-Git directories with actionable guidance (`git init`); do not initialize Git silently.
- Resolve canonical repository root; support invocation from nested directories.
- Create `.agenttm/config.json`, `.agenttm/data/events.db`, `.agenttm/objects/`, `.agenttm/logs/` with restrictive permissions where supported.
- Add `.agenttm/` to `.git/info/exclude` by default (local-only; do **not** edit tracked `.gitignore` without asking).
- Avoid following symlinks outside the repository. Detect nested Git repos and submodules and exclude them from v0.1 snapshots.
- Re-running `init` is idempotent.

### 2.2 Codex integration contract (Codex-first)

- **Supported MVP mode:** AgentTM launches a real **non-interactive** Codex CLI run through its documented `codex exec --json` interface (verify current syntax, flags, event schema, and availability against installed CLI and official documentation before implementation).
- `agenttm run codex -- "task"` starts the Codex child process, consumes JSONL events from stdout, streams human-readable status to stderr/terminal, and persists normalized events to SQLite. Do **not** claim `codex exec --json` exposes every internal decision or every file edit.
- Preserve JSONL boundaries and tolerate unknown event types, missing fields, malformed lines, early process exits, and schema changes. Store sanitized unknown events as `unknown` where safe; do not fabricate fields.
- Capture a **baseline checkpoint before launch** and a **final checkpoint after process exit**, including failure/cancellation. Create intermediate checkpoints only at *verified* safe event boundaries or via explicit workspace observation. Never promise one checkpoint per tool call without demonstrating that the CLI exposes sufficient boundaries.
- Set working directory explicitly to the target repository. Forward exit status and handle Ctrl+C/termination; avoid leaking secrets via command arguments, output, or stored events.
- If a developer already runs `codex` directly, AgentTM **will not automatically record it in v0.1**. This limitation must be visible in README and UI. Native interactive Codex integration is a later feature, not an assumed hook mechanism.
- Do not silently change Codex's approval/sandbox policy or pass unsafe bypass flags. Honor installed Codex authentication and normal user permissions.
- `agenttm connect codex` is **not required in v0.1**; if present, it may only run a readiness check and explain the wrapper workflow. Do not modify user Codex configuration as a fake integration.
- The recording pipeline must remain agent-agnostic via `AgentAdapter`, so a Claude Code adapter can be added later.

---

## 3. System architecture

```text
Developer -> agenttm run codex -- "task"
  └─ Go process supervisor launches real `codex exec --json`
       ├─ baseline workspace checkpoint (before launch)
       ├─ parse JSONL events (stdout) + bounded stderr capture
       ├─ normalize/redact/persist events in SQLite
       ├─ optional intermediate checkpoints at verified boundaries
       └─ final workspace checkpoint (on exit/cancellation)

agenttm ui
  └─ embedded Go HTTP API (127.0.0.1:7331)
       ├─ sessions/events/checkpoints queries (SQLite)
       ├─ snapshot object reader (local object store)
       ├─ diff computation
       └─ fork service (Git worktree)
            └─ React + TypeScript + Monaco UI
```

### 3.1 Suggested repository structure

```text
agenttm/
  cmd/agenttm/main.go
  internal/cli/
  internal/config/
  internal/agents/adapter.go
  internal/agents/codex/exec.go
  internal/agents/codex/jsonl.go
  internal/process/supervisor.go
  internal/events/normalize.go
  internal/events/redact.go
  internal/storage/sqlite.go
  internal/storage/migrations/
  internal/snapshot/manifest.go
  internal/snapshot/objects.go
  internal/snapshot/diff.go
  internal/git/worktree.go
  internal/server/http.go
  internal/server/handlers/
  web/src/components/
  web/src/pages/
  web/src/api/
  web/src/types/
  docs/
  tests/fixtures/
  go.mod
  README.md
```

Use Go `embed` to package the production frontend inside the binary. In development, run Vite separately with a proxy to the Go API.

### 3.2 Core interfaces

```go
type NormalizedEvent struct {
    ID          string
    SessionID   string
    Sequence    int64
    Agent       string
    Kind        string
    ToolName    string
    ToolCallID  string
    OccurredAt  time.Time
    ReceivedAt  time.Time
    PayloadJSON json.RawMessage
}

type SnapshotManifest struct {
    ID            string
    ParentID      string
    SessionID     string
    EventID       string
    CreatedAt     time.Time
    Files         []SnapshotFile
}

type SnapshotFile struct {
    Path      string // normalized repo-relative path
    ObjectID  string // SHA-256 of content
    Mode      uint32
    Size      int64
}

type AgentAdapter interface {
    Name() string
    Available(ctx context.Context) error
    Run(ctx context.Context, repoRoot string, task string, sink EventSink) error
    Normalize(raw []byte) (NormalizedEvent, error)
}
```

Use stable UUIDs for event IDs and session IDs where an upstream ID is unavailable. Never treat wall-clock timestamps alone as ordering guarantees.

---

## 4. Event capture semantics

### 4.1 Initial Codex events

Capture **only** fields and events actually emitted by the installed Codex CLI's supported JSONL stream. Candidate categories to map after validating the real schema:

- Session/turn start and completion, including upstream identifiers if available.
- User task (redacted by default; optionally store prompt text with explicit opt-in).
- Item/tool lifecycle events and available command/output metadata.
- Agent messages and errors, with strict size limits and secret redaction.
- Process exit code, cancellation, and elapsed time (recorded by our supervisor).
- Snapshot baseline/final events generated by AgentTM, clearly marked as **AgentTM observations**, not native Codex events.

**Implementation note:** Before writing the parser, execute a small real Codex run in a disposable Git repository, save redacted fixture JSONL, and document the observed event schema. Do not invent event names, tool IDs, or access to hidden reasoning. If the CLI cannot run due to auth/environment, stop the integration milestone with a clear blocker instead of claiming success.

### 4.2 Normalization and ordering

- Persist raw Codex event input **only if user explicitly opts in**; default is a minimal sanitized normalized record.
- Generate an event ID and receipt timestamp for each Codex event receipt.
- Use a database-assigned monotonic sequence per session under a transaction; events may arrive out of order relative to actual agent actions.
- Correlate related tool records using upstream tool IDs where present; otherwise use best-effort matching and label uncertainty.
- Idempotency key: upstream event/tool ID plus event kind where available; otherwise a process-generated unique ID. Do not collapse repeated identical tool calls based on payload hashes.
- Tool outputs may be huge: enforce maximum bytes, truncate with explicit flags, and redact secrets before persistence.
- Tool handlers should finish promptly; use busy timeout and bounded retry on SQLite contention.

### 4.3 What can be claimed

The UI should say **“observed near event X”** rather than **“caused by event X”** unless attribution is unambiguous. Shell commands, formatters, and background processes can mutate files outside explicit edit tool calls.

---

## 5. Snapshot engine (critical)

### 5.1 Storage design

**Use an AgentTM-owned content-addressed object store for v0.1**, not Git commits in the user's repository. Git is used to discover the repository and to create isolated worktrees; AgentTM snapshot data lives in `.agenttm/objects/` and SQLite. This avoids altering the user's index, refs, HEAD, or commit history and captures uncommitted and eligible untracked files.

Each regular file's content is stored as a SHA-256-addressed blob. A checkpoint is an immutable manifest mapping normalized relative paths to blob hashes, file modes, and sizes. Unchanged blobs are reused. Write objects to temp files and atomically rename; write manifests/DB records transactionally with crash recovery checks.

### 5.2 Scan and capture rules

- At session start, create a **baseline checkpoint** of eligible workspace files.
- At minimum scan before Codex launch and after its exit; create a checkpoint only when state differs. Add intermediate scans only at verified safe boundaries, and label their fidelity.
- Include Git-tracked files and eligible untracked files; honor `.gitignore` plus AgentTM's exclusion rules. Git-tracked files remain eligible even if matching ignore patterns.
- Always exclude `.git/`, `.agenttm/`, known dependency/build/cache folders, secrets patterns, sockets/devices, and oversized files. Document overrides.
- Default maximum individual file size: 2 MiB; default maximum total snapshot size: configurable (e.g. 200 MiB). If excluded, record omission in checkpoint metadata and show **partial snapshot** prominently.
- Detect deletions, additions, modifications, and renames (rename may be inferred heuristically; correctness does not depend on it).
- Avoid symlink traversal; record symlink path/target only when safe, or explicitly omit and flag.
- Capture file mode/executable bit where supported; warn about unsupported filesystem metadata.
- Concurrent writes may yield inconsistent scans: detect changed size/mtime across read, retry bounded times, then mark checkpoint potentially inconsistent.
- Baseline and checkpoints include user-authored changes too; AgentTM does not claim agent-only authorship.

### 5.3 Why not Git stash/commit?

Never run `git add`, `git commit`, `git reset --hard`, `git stash`, or `git checkout` against the user's active working tree as part of automatic capture. These commands could destroy or disturb uncommitted work.

### 5.4 Snapshot manifest example

```json
{
  "id": "cp_01",
  "parent_id": "cp_00",
  "session_id": "session_01",
  "event_id": "evt_12",
  "partial": false,
  "files": [
    {"path": "src/auth.ts", "object_id": "sha256:...", "size": 843, "mode": 420}
  ]
}
```

Store manifests as versioned JSON and index them in SQLite. Validate all object hashes when reading. Garbage collection is out of scope; implement `agenttm doctor` to detect missing/corrupt blobs.

---

## 6. SQLite schema (initial)

Use migration files with `PRAGMA foreign_keys=ON`, WAL mode where supported, and a busy timeout. Example logical schema:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY, root_path TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  upstream_session_id TEXT, agent TEXT NOT NULL, started_at TEXT NOT NULL,
  ended_at TEXT, status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE events (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
  sequence INTEGER NOT NULL, kind TEXT NOT NULL, tool_name TEXT,
  tool_call_id TEXT, occurred_at TEXT, received_at TEXT NOT NULL,
  payload_json TEXT NOT NULL, checkpoint_id TEXT,
  UNIQUE(session_id, sequence)
);
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
  parent_id TEXT, event_id TEXT, manifest_path TEXT NOT NULL,
  created_at TEXT NOT NULL, partial INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE forks (
  id TEXT PRIMARY KEY, checkpoint_id TEXT NOT NULL REFERENCES checkpoints(id),
  worktree_path TEXT NOT NULL, branch_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_session_seq ON events(session_id, sequence);
CREATE INDEX idx_checkpoints_session_time ON checkpoints(session_id, created_at);
```

Migration ordering must avoid circular FK issues; checkpoint links from events may be updated after checkpoint persistence. Define clear transaction boundaries and recovery for partially written blobs/manifests.

---

## 7. Fork and restore behavior

### 7.1 Fork algorithm

1. Confirm checkpoint belongs to the current project; validate object integrity and manifest version.
2. Refuse **partial checkpoints** by default; allow explicit `--allow-partial` with clear warning.
3. Create a uniquely named Git branch/worktree at the project's recorded base commit (or current HEAD with an explicit warning if baseline commit cannot be resolved).
4. In the **new** worktree only, materialize the checkpoint manifest to match the captured eligible files: overwrite files in the new worktree, remove tracked files absent from the manifest where appropriate, create eligible untracked files.
5. Never modify `.git/`, `.agenttm/`, or paths outside the new worktree. Validate normalized paths against traversal (`../`), absolute paths, symlink escapes, and case-insensitive collisions.
6. Verify restored files' content hashes; if restoration fails, clean up the newly created worktree safely or leave it marked failed with instructions.
7. Record the fork path and metadata; print how to open it.

**Important:** The restored workspace may be dirty relative to the fork's Git HEAD. That is expected. The branch name is a container for isolated work; the historical state is represented by AgentTM's manifest, not necessarily a Git commit.

### 7.2 Safety guarantees

- Original working tree, index, and Git HEAD must remain byte-for-byte unchanged by `fork`.
- Never overwrite an existing destination or branch name.
- Do not automatically execute restored scripts, dependency installers, or agent commands.
- On Windows, handle locked files, path lengths, and case-insensitive path collisions gracefully.

---

## 8. HTTP API (local only)

Bind to `127.0.0.1` by default, not `0.0.0.0`. Use an ephemeral local auth token or same-origin protections and strict Origin checks for state-changing routes; never enable permissive CORS. Return structured errors and validate all IDs/paths.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health and version |
| GET | `/api/sessions` | List sessions for current project |
| GET | `/api/sessions/{id}/events?cursor=` | Paginated timeline |
| GET | `/api/sessions/{id}/checkpoints` | Checkpoints |
| GET | `/api/checkpoints/{id}` | Manifest metadata |
| GET | `/api/checkpoints/{id}/tree` | File tree |
| GET | `/api/checkpoints/{id}/file?path=` | Historical file content (text only; bounded) |
| GET | `/api/checkpoints/{id}/diff?against=parent` | Added/removed/modified diff |
| POST | `/api/checkpoints/{id}/fork` | Create isolated worktree |
| GET | `/api/events/stream` | SSE timeline updates (optional after polling works) |

Sample event response:

```json
{
  "id": "evt_12",
  "session_id": "session_01",
  "sequence": 12,
  "kind": "post_tool_use",
  "tool_name": "Edit",
  "received_at": "2026-11-02T00:00:00Z",
  "checkpoint_id": "cp_01",
  "changed_paths": ["src/auth.ts"],
  "attribution": "observed_after_tool"
}
```

Pagination is mandatory for event lists. API must never accept arbitrary absolute filesystem paths from the browser.

---

## 9. UI specification

### 9.1 Main screen

Three-column layout:

1. **Left: Timeline** — sessions and ordered events; type icons; timestamps; tool status; checkpoint badges; filter by tool, event kind, file path.
2. **Center: Code** — historical file tree, Monaco read-only viewer, unified or side-by-side diff, selected checkpoint label.
3. **Right: Activity** — tool name, sanitized input/output summary, linked prompt metadata, changed files, confidence/limitations.

Header: project name, agent, session, checkpoint ID, privacy status. Footer actions: previous/next event, compare with previous checkpoint, fork checkpoint.

### 9.2 Interaction requirements

- Selecting an event with a checkpoint displays that checkpoint; events without checkpoints display the last known state and an explicit indicator.
- Diff is against the parent checkpoint by default.
- File attribution is best-effort; never claim proof of causal origin.
- Fork requires a confirmation dialog showing destination path and warnings for partial snapshots.
- Loading, empty, missing blob, malformed payload, and fork failure states must be implemented.
- Avoid rendering untrusted HTML or terminal output as executable content.

### 9.3 Accessibility

Keyboard navigation, semantic controls, readable contrast, screen-reader labels, and responsive layout at laptop widths. No mandatory dark mode, but provide a usable dark theme if inexpensive.

---

## 10. Privacy, security, and resource limits

**Threat model:** Agent events and file snapshots can contain proprietary source, tokens, credentials, personal data, and maliciously crafted text. The browser UI and fork service must treat them as untrusted.

Required controls:

- Local-only by default; no analytics/telemetry or outbound requests without explicit opt-in.
- Redact common credential patterns from event payloads before writing to disk; document that regex redaction is imperfect.
- Default prompt capture off or metadata-only; enable full sanitized prompt capture via explicit config.
- Snapshot exclusion patterns for `.env*`, private keys, credential files, caches, build outputs; note exclusions may make snapshots partial.
- Protect files via OS permissions where possible; clearly state local users with filesystem access may read them.
- Do not execute stored event payloads, tool outputs, or checkpoint code during inspection.
- Escape/sanitize all displayed text; validate API paths and prevent directory traversal and symlink escape.
- Enforce payload, file, total snapshot, and API response limits; report truncation/omissions.
- No implicit cloud upload. No collection of hidden model reasoning.
- Allow `agenttm purge --session <id>` with confirmation and a documented object cleanup strategy (can defer blob GC to v0.2).

---

## 11. Config format

`.agenttm/config.json` example:

```json
{
  "schema_version": 1,
  "storage": { "max_file_bytes": 2097152, "max_snapshot_bytes": 209715200 },
  "capture": {
    "prompt_mode": "metadata_only",
    "max_event_payload_bytes": 65536,
    "snapshot_after_tool": true
  },
  "exclude": [
    ".env", ".env.*", "**/*.pem", "**/*.key",
    "node_modules/**", "vendor/**", "dist/**", "build/**", ".agenttm/**"
  ],
  "server": { "host": "127.0.0.1", "port": 7331 }
}
```

Validate schema version and unknown/invalid values with helpful messages. Prefer conservative defaults. Document ignore precedence for tracked files and explicit exclusions.

---

## 12. CLI command behavior

| Command | Required behavior |
|---|---|
| `agenttm init` | Initialize local store and config; idempotent |
| `agenttm run codex -- "task"` | Launch real Codex in JSONL mode; record events and snapshots |
| `agenttm codex doctor` | Check Codex CLI availability, auth readiness where observable, and JSONL support |
| `agenttm ingest codex` | Internal parser/ingestion component; not required as public CLI |
| `agenttm sessions` | List sessions with ID, agent, start time, status |
| `agenttm checkpoints <session>` | List checkpoint IDs, times, partial flags |
| `agenttm ui [--port]` | Start local server; embed frontend |
| `agenttm fork <checkpoint> --name <name>` | Safe isolated restore |
| `agenttm doctor` | Verify repo, Codex readiness, DB, blobs, config |
| `agenttm version` | Version and build info |

CLI errors should include recovery guidance. Capture failures should be visible and should not be misreported as successful recordings. Keep machine-readable JSONL separate from user-facing progress. Use structured exit codes and preserve Codex exit status.

---

## 13. Testing strategy and acceptance criteria

### 13.1 Automated unit tests

- Config validation and migration.
- Redaction for common secrets and truncated payloads.
- Event normalization with missing optional fields.
- Robust JSONL parsing (unknown events, truncated records, malformed lines) and Codex process lifecycle handling.
- Snapshot content hashing, deduplication, additions/deletions, executable modes, partial flags.
- Path traversal, symlink escape, and case-insensitive collision rejection.
- Diff generation for text/binary files.
- DB concurrent event writes and event ordering.

### 13.2 Integration tests

Use a disposable temporary Git repository with tracked files, untracked files, ignored files, and uncommitted modifications.

1. `init` does not modify tracked files or the index.
2. Synthetic Codex JSONL fixtures create a session and events in SQLite.
3. Modify files between synthetic baseline and final scans; assert checkpoint manifests and historical content.
4. Add and delete files; verify reconstruction.
5. Fork an earlier checkpoint; compare all included file hashes with the manifest.
6. Assert original repository HEAD, index, and working-tree file hashes are unchanged.
7. Kill a recording process during object persistence; `doctor` detects/reports recoverable state.
8. Repeat with project path containing spaces and Unicode.
9. API rejects traversal, malformed IDs, oversized output requests, and unauthorized state-changing cross-origin requests.

### 13.3 Manual end-to-end test (required with actual Codex)

On an installed, authenticated, supported Codex CLI version:

1. Create a disposable Git repository with a simple Go or TypeScript app.
2. Run `agenttm init` and `agenttm codex doctor`.
3. Run `agenttm run codex -- "Add a small function, modify a test, and run the test suite"`.
4. Confirm a **real Codex process** executed and real JSONL events were persisted; no simulated agent output.
5. Confirm baseline/final checkpoints reflect actual changed files, including untracked eligible files.
6. Inspect historical file content and diff in UI; do not claim step-level fidelity unless intermediate checkpoints exist.
7. Fork a checkpoint and inspect restored files; verify original repo is untouched.
8. Run a failed/cancelled Codex task and verify session status, errors, and final snapshot behavior.
9. Repeat in a path containing spaces; document any platform limitations.

**Do not claim the MVP is complete until this real Codex integration test passes.** Synthetic fixtures alone are insufficient.

---

## 14. Milestones / build order

### Milestone 0 — Repo + executable (foundation)

Deliver: Go CLI, `init`, config, SQLite migrations, logging, `version`, `doctor` skeleton, README, CI. Tests for initialization and path safety.

### Milestone 1 — Real Codex CLI event ingestion

Deliver: Codex version/capability check, supervised `codex exec --json` execution, JSONL parser, event normalization, redaction, sessions/events persistence, CLI session listing. Capture redacted fixtures from a real run and test with actual Codex before proceeding.

### Milestone 2 — Snapshot engine

Deliver: baseline capture, content-addressed blobs, immutable manifests, incremental checkpoint detection, exclusions, limits, diff engine, integrity checks. Test dirty and untracked files.

### Milestone 3 — Read-only UI

Deliver: embedded React frontend, session timeline, event details, historical tree/content/diff, API pagination, error states. UI must use real stored data.

### Milestone 4 — Safe fork

Deliver: `fork` CLI + API action + UI confirmation, worktree creation, manifest materialization, validation, cleanup. Prove no mutation to original working tree.

### Milestone 5 — Hardening + release

Deliver: Windows/Linux/macOS CI builds, cross-platform smoke tests, Codex version compatibility checks, documentation, sample recording, installer/release archives, end-to-end manual checklist.

**Definition of Done:** All acceptance outcomes in §1.2, tests in §13, and security controls in §10 pass. Provide documented limitations rather than claiming unsupported behavior.

---

## 15. Decisions, tradeoffs, and known limitations

1. **Single binary vs npm package:** release native Go binaries first; npm/Homebrew wrappers are optional future distribution channels.
2. **Snapshot store:** own SHA-256 object store for safe uncommitted state capture; Git worktrees only for isolated forks.
3. **Capture fidelity:** Codex JSONL provides observed boundaries, not guaranteed continuous filesystem monitoring; missed/background changes may be attributed to the next checkpoint.
4. **Partial snapshots:** exclusions, large files, symlinks, and races mean some checkpoints cannot fully reconstruct a runnable project.
5. **External state:** databases, packages, API calls, environment variables, containers, and running processes are not restored.
6. **Agent context:** no deterministic re-execution or recovery of private reasoning; v0.1 doesn't resume an agent from a checkpoint; Codex runs must be launched through `agenttm run codex`.
7. **Privacy:** local-first reduces exposure but does not make stored transcripts/snapshots automatically safe; redaction is best-effort.
8. **Monorepos:** supported as a Git repository, subject to snapshot size limits; nested repos/submodules excluded in v0.1.
9. **Performance:** whole-tree scans may be expensive; begin with correctness, add incremental indexing/OS filesystem notifications later.
10. **Official integration drift:** Codex CLI event schemas and agent APIs evolve; isolate adapter code and pin/test supported versions.

---

## 16. Instructions to Codex implementing this project

**Role:** You are Codex acting as the principal engineer building AgentTM from this spec. Implement a production-minded MVP with working code, not only a design document.

**Workflow:**

1. Read this entire document and inspect the existing repository before writing code.
2. Confirm current Codex CLI `exec --json` contracts against installed `codex --help`, official documentation, and a real disposable test run. If docs or executable are unavailable, isolate assumptions and mark the integration as blocked; do not invent payload fields.
3. Create a concise implementation plan and identify any ambiguities that would block safe implementation.
4. Implement **Milestone 0 only**, including tests and a usable CLI. Run tests and report results.
5. Then implement Milestones 1–5 sequentially, validating each before moving on; if running in an environment with limited time/context, stop at a tested milestone and report exactly what remains.
6. Prefer standard Go packages, `database/sql` with a well-maintained SQLite driver, and small, explicit interfaces. Avoid unnecessary frameworks and distributed infrastructure.
7. Never modify the user's active Git index/HEAD/working tree during automatic recording or restore.
8. Never log unredacted secrets or silently upload repository content.
9. Include commands to run, tests executed, limitations, and the next milestone in each progress report.
10. Do not mark features complete when only API stubs or UI mock data exist.

**First task to execute now (using Codex as the implementation agent):** Scaffold the Go module and CLI, implement `agenttm init` and `agenttm version`, establish config and SQLite migration packages, add unit/integration tests, and document local build instructions. Then stop and summarize Milestone 0 status before proceeding.

---

## 17. Future extensions (not part of v0.1)

- Claude Code adapter using documented project-scoped hooks.
- Interactive Codex capture using supported APIs or native integrations, if available.
- Explicit `continue` with native session fork when supported or fresh session + reconstructed visible context.
- VS Code extension: right-click a line to show related agent events (best-effort attribution).
- Branch comparison across two checkpoint forks.
- Opt-in encrypted backup/sync.
- Filesystem watcher and background daemon for more complete state capture.
- Snapshot retention policy, compression, object garbage collection, and storage budget UI.
- Support for other agents through `AgentAdapter`.

**North-star product promise:** “Understand and safely branch the observable history of AI-assisted code changes.”
