# Local history UI and safe forks

`agenttm ui` serves the current project's real SQLite sessions, events and
checkpoints at `http://127.0.0.1:7331`, and opens the default browser. It does not
launch Codex. `--no-browser` suppresses browser launch, `--port 7332` changes the
port, and `--port 0` chooses an available port and prints its URL. The default is
read from `.agenttm/config.json`. Ctrl+C gracefully stops the server.

No account or frontend development server is required for inspection. The binary
embeds the React, TypeScript, CSS, Monaco editor, language definitions and worker
assets. It makes no analytics, CDN, font or model requests. Binary/non-UTF-8 files
show a message; displayed file content always comes from verified snapshot objects,
never the current working file. Missing/corrupt storage has explicit error/retry
states and never falls back to the live workspace.

## Navigation and scope

- The sidebar separates Overview, Sessions, Checkpoints, Restored workspaces,
  and Setup & help. Overview explains the workflow and links to recent recordings.
- Sessions starts with a recording list. Open a recording to switch between
  Timeline, Files, and Changes. The timeline shows event details without placing
  the file browser on the same screen. Session/event/checkpoint selection stays
  in memory when moving between pages.
- Checkpoints provides a session selector, historical files, parent comparisons,
  and the explicit fork action. Restored workspaces lists actual recorded restore
  results for this project, with folder location, branch, checkpoint, and status.
  This list does not verify whether a worktree still exists.
- Setup & help explains sessions, events, checkpoints, and restores. The desktop
  can check Codex readiness; browser users get the equivalent terminal diagnostic.
  The step-by-step Setup guide is available in both desktop and browser modes.
- Select a session above its timeline or checkpoint browser. Older sessions are paginated. Phase 1 sessions
  have events but no file history; the UI explains how to start a new recording.
- Select events in receipt order, using event buttons or Previous/Next. Filtering
  by event kind, tool and path applies to loaded events; Load next events extends
  the set. Path filtering uses observed changed-path metadata where available.
- An event with a checkpoint displays that state. An event without one displays
  the most recent preceding checkpoint with a **Last known workspace** label.
  No future checkpoint is substituted for an earlier event. The checkpoint picker
  explicitly labels manual selections.
- The hierarchical tree lists eligible historical paths. Find a file filters the
  loaded paths; Load more files extends the set. The Monaco editor is read only
  and keyboard accessible. It falls back to plain read-only text if editor loading
  fails. Files are never executed and links inside stored content are disabled.
- Compare with parent displays additions, removals, modifications, mode changes
  and bounded whole-file unified patches. Baselines compare with an empty tree.
  Binary changes and truncated patches are labeled. Additional changes are paged.
- Partial snapshots display omissions (first 100 in the UI) and consistency
  warnings. Use `agenttm show` for a checkpoint's complete omission metadata.
- Sessions and recorded events refresh every four seconds after the loaded event
  page reaches the end. Existing history selection remains fixed when new events
  arrive. Refresh in the header reloads stored data without creating any recording.

The UI shows observable events, not hidden reasoning or complete shell activity.
An event's `completed` status is not proof that a requested coding task succeeded.
Workspace changes can come from users or background tools. Baseline/final/manual
scans do not establish per-tool causality. Only AgentTM-managed noninteractive
Codex runs are recorded. **Fork checkpoint** opens a confirmation dialog with the
server-computed destination/branch, warnings and separate partial-restore consent.
Success shows the restored path; failures are displayed without running captured
code or changing the original workspace.

## Loopback API

History is GET-only. The sole mutation is POST to a checkpoint's `/fork` route,
requiring a matching Origin, per-server `X-AgentTM-CSRF` token from same-origin
`/api/health`, JSON content type, a bounded strict schema and `confirmed: true`.
Other methods return structured 405 errors. The server
binds only to `127.0.0.1`, checks the exact Host, and rejects foreign Origin and
cross-site Fetch Metadata headers. There is no permissive CORS. Browser protections
use same-origin checks, CSP, frame denial, no-store and nosniff. This does not stop
local programs/users who already have access to the repository's local files.

| Endpoint | Query / response |
| --- | --- |
| `/api/health` | Version, project basename, privacy and capture mode |
| `/api/sessions` | `cursor`, `limit` (default 50, max 100); newest first |
| `/api/forks` | Exclusive `cursor`; pages of 100 recorded restore results scoped to this project |
| `/api/sessions/{id}/events` | `cursor` exclusive sequence; default 50, max 200 |
| `/api/sessions/{id}/checkpoints` | `cursor`, `limit` (default 50, max 100) |
| `/api/checkpoints/{id}` | Validated summary and bounded omissions |
| `/api/checkpoints/{id}/tree` | `cursor` offset; default 250, max 1000 paths |
| `/api/checkpoints/{id}/file?path=` | Verified UTF-8 contents, max 1 MiB |
| `/api/checkpoints/{id}/diff?against=parent` | `cursor` offset; default 20, max 100 changes |
| `GET /api/checkpoints/{id}/fork?name=` | Server-computed restore plan and warnings |
| `POST /api/checkpoints/{id}/fork` | `{name, allow_partial, confirmed}`; 4 KiB maximum |

List responses contain `items` and `next_cursor` (`null` when complete). Checkpoint
lists also expose `last_cursor` for incremental refresh. IDs must be UUIDs belonging
to this project. Paths must be normalized, repo-relative manifest entries. Absolute
paths, traversal and local storage paths are rejected. JSON responses are bounded
to 8 MiB. Event pages additionally stop near 3 MiB of stored payload. Expensive
requests have a concurrency limit of two. Existing per-file/manifest limits and
hash checks apply; diffs read blobs only for their requested page.

## Frontend development and tests

Requires Node 24+, Go and Git. Dependencies are pinned by `web/package-lock.json`.
The DOMPurify override is intentional: Monaco's pinned dependency required a newer
security patch. `npm audit` reported zero vulnerabilities during this implementation.
Third-party license notices are bundled at `/third-party-notices.txt` on each build.

```powershell
Set-Location C:\dev\AgentTM\web
npm.cmd ci
npm.cmd test
npm.cmd run build
Set-Location ..
go test ./...
go vet ./...
go build -o .\bin\agenttm.exe .\cmd\agenttm
```

For Vite development, run `agenttm ui --no-browser` in one terminal and `npm.cmd run
dev` in `web` in another. Vite serves on loopback and proxies `/api` to port 7331;
only that development proxy rewrites the trusted `127.0.0.1:5173` Origin to the backend origin.
Production has no proxy. A production Go rebuild is needed after `npm run build`
to embed changed assets. Node is needed to build, not to run the resulting binary.

Run browser checks with installed Chrome:

```powershell
Set-Location C:\dev\AgentTM\web
npm.cmd run test:e2e
```

If port 7333 is free, the test harness creates a uniquely named **synthetic-test**
repository under `.test-work`, using actual Git enumeration, SQLite, manifests and
objects. It launches the built binary and stops its owned server afterward. This
data is labeled synthetic and is never used by ordinary recording. Test repositories
remain ignored for inspection. For CI, Playwright uses its installed Chromium.
For an already-running server with the sample `example.txt` history, set
`AGENTTM_TEST_URL` to its loopback URL; the test harness then owns no server.

Browser tests verify actual Monaco rendering, historical content, diffs, event
state uncertainty, path filtering, missing-object/empty-history states and mobile
layout. Failure states use explicit test-only request interception. The main
history test uses stored data throughout. The suite also passed against the real
Phase 2 recording in a path containing spaces and Japanese characters. Go tests
cover API pagination, project isolation, input limits, missing objects, and rejected
cross-origin, traversal, oversized-file and state-changing requests. Non-Windows
builds compile locally; remote CI execution is not claimed as observed here.
