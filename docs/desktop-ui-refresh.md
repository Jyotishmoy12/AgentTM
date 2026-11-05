# Desktop interface refresh

The shared React dashboard now uses a graphite design system with restrained
green accents, compact navigation, consistent view headers, and a persistent
status strip. The native project welcome screen and Windows title bar use the
same dark direction. The browser dashboard receives the shared visual changes;
recording, checkpoint, restore, backup, and garbage-collection APIs are unchanged.

## Design references

- [Linear's March 2026 refresh](https://linear.app/changelog/2026-03-12-ui-refresh):
  consistent headers, icons, and view controls; dimmer navigation to foreground
  the work itself.
- [GitKraken's interface guide](https://help.gitkraken.com/gitkraken-desktop/interface/):
  clear navigation/history/inspection regions, compact toolbar and status bar,
  adjustable panels. AgentTM's timeline is an event history, not a Git graph.
- [GitKraken's diff guide](https://help.gitkraken.com/gitkraken-desktop/diff/):
  explicit inline and split inspection modes with file selection kept nearby.
- [Raycast quickstart](https://manual.raycast.com/quickstart): searchable actions,
  discoverability, and keyboard navigation. AgentTM's command menu stays inside
  the app and only routes to its existing views and loaded sessions.

These are interaction and visual references, not copied brand assets or promises
of their product capabilities.

## Using the refreshed app

- Use the sidebar for Overview, Chat with Codex, History, Restored
  workspaces, Storage & backups, and Settings. Descriptive hints remain in
  the navigation tooltips and on each view.
- Open **Commands**, or press **Ctrl+K** (Cmd+K in a macOS browser), to search
  destinations and currently loaded sessions. Use Up/Down, Enter, and Escape.
  It does not search uncaptured files or unloaded history. Restore and storage
  mutations keep their own existing confirmation flows.
- Collapse the sidebar from the toolbar or use **Ctrl+B** outside text inputs.
  At compact desktop widths, navigation automatically becomes an icon rail.
  The button reflects that responsive state and can explicitly expand the rail;
  an explicit choice persists across tab changes and window resizing.
  On narrow browser screens it becomes a horizontal navigation strip.
- **History** consolidates sessions and checkpoints. Choose a session in its compact
  selector, or open one from Overview or Chat. The default is a chronological
  discovery screen with distinct prompt, command, response, failure, and capture
  icons, friendly activity labels, and captured-workspace
  milestones. Files and code are absent until you choose **Inspect checkpoint**.
- History offers Everything, Events, and Checkpoints filters, a search over loaded
  event titles/commands/changed paths, partial-capture and failure filters, and
  expandable recorded payloads. Technical event names remain in expanded details.
  For at least 20 loaded events spanning more than one timestamp, an activity strip
  groups actual received timestamps into 48 equal time intervals. Clicking a
  populated bar resets timeline filters, reveals a bounded segment, scrolls to
  its first recorded event, and transfers keyboard focus. Empty bins are disabled.
  Short sessions hide the histogram. Reduced-motion preferences are respected.
  The strip is not a
  cost, performance, or provenance metric. Counts and pagination describe loaded
  history; no unloaded data is inferred. At most 80 observations render initially;
  Show next observations reveals another 80. A compact session summary stays
  visible while the editorial heading scrolls away. Dates use an explicit month
  name and counts use singular/plural wording. Checkpoints prioritize capture
  times over internal hashes; Compare with previous opens Changes only when
  the manifest parent is present in loaded checkpoint data.
- Adjacent technical events can collapse together only when an explicit retained
  turn or tool-call identifier matches. No turn membership is inferred from time
  or order. Failures and checkpoint milestones stay separate.
  **View operation boundaries** preserves
  the existing operation ledger and supported before/after inspection actions.
- **Checkpoint Explorer** is a separate focused workspace. Its searchable file
  panel can be resized by dragging the separator or using Left/Right, Home, End.
  The code viewer occupies the rest of the space. Details starts closed and opens
  as a narrow side panel or overlay at smaller desktop widths. Escape closes it.
  Returning to History preserves its filters, expanded events, and scroll position.
- Partial captures stay marked; their omissions remain expandable above the
  inspector. Restore review also fetches the selected capture and lists omissions
  before confirming its existing backend-generated destination. Partial consent,
  verified restoration, result path copying, and the restored-workspace list remain
  unchanged. Restoring does not rewind the Codex conversation.
- Files shows captured historical content. Changes offers **Inline** and
  **Split** comparisons using the captured parent and selected file contents.
  Editors are read-only; switching modes retains the file selection and editor
  view state. Only parent comparisons are supported. Binary, oversized, missing,
  or corrupt captures retain explicit limitations instead of fabricated text.
- Timeline events and grouped records use keyboard-accessible disclosure controls.
  Search covers loaded history only; older pages load through the existing APIs.
- **Restore checkpoint** keeps the existing destination preview, validation,
  partial-snapshot consent, isolated worktree creation, and hash verification.
  The success view offers a copy-path action and navigation to restored
  workspaces. It does not execute restored code or rewind the Codex conversation.
- The project selector shows the current project and, in the Windows native
  app, opens another existing Git project in a separate AgentTM window.
  Initialization remains an explicit confirmation in the new window. This
  preserves the current engine and any active recording. The browser explains
  how to launch its existing UI command from another project instead.
  The dialog uses neutral charcoal surfaces, selectable location text, an inline
  copy action, and explicit loading, retry, cancellation, and launch-request
  feedback. Reading the current path does not run Codex readiness checks.
  The child process receives the selected project explicitly, including when
  initialization still needs confirmation; it does not ask for the folder again.
- Chat uses a compact conversation header and centered reading column. The
  history icon opens saved conversations; the plus starts a new conversation.
  **View history** opens that conversation's recorded events and checkpoints.
  Model discovery, permissions, and **Model settings** are in the rounded
  composer. Model settings opens above the toolbar and closes with Escape.
- In chat, Enter inserts a newline; **Ctrl+Enter** submits. Send is disabled
  while a turn starts or runs; Stop remains
  available during a running turn. These actions reuse the existing native
  bridge and recording behavior, without new backend endpoints.
- User prompts, Codex replies, tool results, and system failures have distinct
  presentation. Tool details collapse; recorded failed tools open by default.
  Supported approvals have their existing Allow once / Decline actions and a
  visible Review banner when you are reading elsewhere in the transcript.
- Chat renders fenced code blocks, inline code, and bold text as safe React
  content, with copy controls and bounded scrolling for code/logs. Raw HTML is
  displayed as text. It does not claim full Markdown or syntax highlighting.
- Streaming follows the bottom only while you are reading there. Scrolling up
  preserves your position, with **Latest messages** to return. Current-window
  prompts can remain visible in memory without enabling persistent prompt
  capture; navigating away does not recover previously uncaptured prompts.
- The overview counts only loaded sessions and labels that scope explicitly.
  No usage metrics or inferred provenance are introduced.
- Overview uses a compact library layout: icon-led recording actions,
  Recents/Active/Completed filters, and document-style session cards. The cards
  display the first stored user prompt as their title when available; otherwise
  they retain the agent/session title. Prompt-capture placeholders are never
  promoted to titles, and no private Codex history is read for this purpose.
  Cards show the actual project, date, status, and a bounded activity preview.
  Each preview requests the first 12 events through the existing API and displays
  at most three excerpts, capped at 120 characters each. Commands, messages,
  and changed paths take priority over lifecycle events. Compact cards use
  neutral borders, green hover/focus accents, and a View session affordance.
  Missing previews are labeled explicitly. The shared sidebar starts with the
  project selector and search, followed by Overview, Chat, and the other workspace
  destinations. Its visual and keyboard navigation orders agree.
  This shell remains the same across tabs. Card titles do not shrink, and only
  the activity preview clips to its available space. Surfaces use neutral
  charcoal with restrained green accents.

Overview now fills its available content width with balanced gutters rather than
leaving an empty strip beyond an 860px cap. The command palette uses the same
neutral charcoal surfaces, simpler icons, and a scrollable results area that keeps
search and keyboard hints visible at the minimum desktop size. The first-launch
project screen follows the same typography and palette; its native folder picker,
initialization consent, cancellation, and retry behavior are unchanged. Twelve
focused shell, Overview, command-menu, and launcher browser checks passed at
desktop widths up to 1920px and down to 760x550. Launcher behavior also passed
the existing frontend unit checks and native desktop package tests.

The finishing pass shares heading sizes, content gutters, dialog backdrops,
close-button icons, scrollbar styling, and keyboard focus colors. Session cards
have a clearer whole-card hover state while Rename remains a separate keyboard
action. Collapsed-sidebar hints appear for both pointer hover and keyboard focus,
describe their associated controls, and dismiss with Escape or navigation.
The session-name field receives initial focus even with a close button before it.
Dialog actions remain disabled during existing protected operations.

## Build and preview

From `web`, build the production frontend:

```powershell
npm.cmd run build
```

From the repository root, build and run the native Windows app:

```powershell
.\scripts\desktop.ps1
```

Close an older source-built desktop app before replacing its executable. The
stable local output remains `bin/desktop/AgentTM.exe`. The Go binary embeds the
compiled assets, so rebuilding only the frontend does not update an already built
desktop executable. Launch from an initialized project to open it directly, or
outside one to see the project picker. No new release is published by these steps.

Frontend regression checks, from `web`:

```powershell
npm.cmd test
npm.cmd run test:e2e
```

End-to-end tests use a disposable repository seeded by the existing test helper.
They do not modify the developer's recorded history or call the real Codex
service. Chat presentation tests use an explicitly simulated desktop bridge.
The project-menu browser test also simulates its native bridge; it is not a
claim that a Windows directory-picker click was automated.

The workspace redesign does not change recording semantics, backup format, or
restoration safety policy. Session naming, added separately below, introduces a
metadata migration. These changes apply to source builds; an existing
release archive does not acquire the updated UI until a new binary is built.

## Restored workspace manager

Restored workspaces uses compact searchable, sortable rows with actual folder
basenames as identities. The selected record exposes the complete path, branch,
source checkpoint, and recorded timestamp. No descriptive names are invented.
A details drawer is used at smaller desktop widths, with Escape/focus return;
copy, source inspection, and folder opening remain near the top of the details.

The existing paginated GET /api/forks ledger is unchanged. Its ready status is
labeled Completed as a recorded restore result, not a current health indicator.
Two small Windows native methods were added because no folder action existed:
CheckRestoredWorkspace and OpenRestoredWorkspace. Both resolve the restore ID
through the active project's ledger. Only direct children of its managed worktree
directory are accepted, and unsafe links are blocked. The check reads directory
availability only; it does not run Git or verify restored content. Open rechecks
and starts the fixed Windows File Explorer executable with a single path argument,
without a shell. It does not launch an editor or run workspace code.

Browser regression checks simulate native methods to cover dispatch and feedback;
filesystem guard tests use disposable repositories. Interactive File Explorer
window display still needs a manual native check. No deletion action is added.

## Storage and backups

The page separates a measured Local history overview, encrypted backup/restore
entry points, and Storage Cleanup. Passphrase forms exist only in their own
modal flows. Confirmation is required for new backups; values clear on submit,
error, cancellation, or dialog teardown and are not persisted or logged.

Restore reuses the existing native RestoreHistory sequence: archive picker,
clean Git target picker, final native confirmation, then authentication/staging
validation and publication. The React dialog explains those steps and prevents
dismissal during the operation; it does not invent file-validation progress or
allow overwriting history. Backup uses the existing CreateBackup handler and age
format. Native picker clicks themselves still require manual desktop verification.

Storage Cleanup reuses GarbageCollect, its 24-hour retention, reference checks,
locks, and candidate token. A preview does not delete anything; consent and an
explicit Delete previewed blobs action are needed. Error responses invalidate the
preview and warn that deletion may have partially completed before failure.

One read-only native method, StorageUsage, was necessary because sizes were not
previously exposed. It sums regular files under .agenttm in disjoint categories:
objects, SQLite database plus sidecar files, manifests, logs, and other files.
Worktrees are excluded. Sizes are logical bytes observed during the scan, not
allocated disk space or an atomic snapshot. Unsafe links or read failures produce
an unavailable state instead of a partial total; browsers/older native builds
also have a truthful fallback. Measurements never determine cleanup eligibility.

Tests cover genuine encrypted round trips, incorrect passwords, corrupt/missing
archives, existing target history, staging cleanup, maintenance/recording locks,
recent-blob retention, corrupt indexed manifests/objects, and storage category
sums. Browser tests simulate the native bridge for modal actions, errors,
cancellation, secret clearing, stale previews, zero eligible blobs, and small
windows; actual encryption/restoration is tested in disposable Go fixtures.

## Settings and Setup Guide

Settings uses grouped General, Environment, and About rows with no secondary
navigation or preference switches. Current project and prompt-capture mode are
read-only values from loaded configuration. About shows the current binary's
reported version and whether this is the native desktop or browser interface.

Environment preserves Check again and the existing Codex version, exec --json,
and observable login checks. The native CheckSetup response now also includes
read-only Git version and expected-repository-root checks. Missing, failed, or
unavailable checks are never promoted to success. A separate existing history
API read checks database readability; it is explicitly not an integrity scan.
Model access, connectivity, and successful tool execution still require a real run.
Browser builds and older native responses leave unsupported checks unverified.

The existing Setup Guide retains its first five onboarding steps and completion
preference. New reference sections cover History basics, Capture & limits, and
Restore safely, including copyable commands, omissions, optional boundary capture,
non-atomic observations, and the distinction between restoring files and resuming
a Codex thread. Settings help links open the relevant guide section. The guide
uses native browser dialog modality, Escape dismissal, and focus return; the
small-window guide keeps navigation and footer actions accessible.

Git diagnostics are covered with disposable real repositories, a missing PATH,
and a cancelled check. Browser tests cover ready, missing/incompatible CLI,
unconfirmed sign-in, failed native and database checks, browser fallback, guide
copy/navigation, focus return, and the minimum desktop window. No recording,
checkpoint, or restoration semantics were changed by this pass.

## Session names

Use the pencil button on an Overview card, or **Name session** in History. Enter a name and select **Save name**. Names appear in Overview,
History, session/conversation selectors, and the command menu. Clear the name
and save to restore the saved-prompt heading or agent/session fallback.

Names are explicit local metadata, limited to 120 characters. Naming does not
enable prompt capture, read private Codex conversations, alter recorded events,
or rewrite checkpoints. Saved names take priority over prompt-derived headings.
Existing recordings without stored prompts remain unnamed until you name them.

Schema migration 5 adds the `sessions.title` column without deleting history.
Names are included in encrypted database backups and restored with them. Older
builds supporting only schema 4 refuse the upgraded database; close older app
instances before opening a project with this build. The new naming endpoint is
project-scoped and requires the same origin/CSRF protection as other mutations.

## Verification of this source build

Checked on Windows on November 5, 2026:

- `npm.cmd test`: 14 frontend unit tests passed.
- `npm.cmd run build`: TypeScript and production assets passed. Vite retains
  its size warning for the existing lazy-loaded Monaco bundle.
- `npm.cmd run test:e2e`: 44 browser regression tests passed against an owned
  local server and disposable synthetic history. Checks include chat and storage
  bridge actions, operation before/after inspection, partial restoration through
  the real backend, minimum-size panel resizing, inline/split comparisons,
  read-only keyboard input, and editor scroll restoration.
- A simulated 3,000-event history initially mounts at most 80 chronological rows.
  Searching reaches the final event without rendering earlier rows. Its density
  check uses two real timestamp clusters and confirms two populated time bins.
  This is a UI check, not a database throughput benchmark.
- `go test ./...`, `go vet ./...`, and
  `go vet -tags production ./cmd/agenttm-desktop`: passed.
- CLI and native production Windows builds passed. An owned native-window smoke
  check in the earlier shell refresh confirmed the AgentTM title, resizable
  window style, and dark title bar.
- `node scripts/check-docs.mjs`: 29 Markdown files passed link/reference checks.

The new History and Explorer were exercised at 1440x1000 and 760x550; shared
shell/chat regression checks also cover 1240x800 and 1100x740. A GET-only preview
opened the existing SQLite database read-only and verified real recorded history
and a partial checkpoint at both History/Explorer desktop sizes, with zero browser
errors. Restore tests use disposable synthetic history, never the existing project.
Automated access to the native WebView2 debugging endpoint was unavailable in
this environment. Native directory-picker selection and launching the second
project window therefore still need a manual end-to-end check; the menu's bridge
dispatch and cancellation state were tested with a simulated bridge. No real
Codex task or release publication was performed for this UI change.

Project-dialog follow-up validation: seven focused browser checks passed for
path loading, copying and clipboard errors, cancellation, native failure and
launch-request feedback, pending-action guards, focus return, long paths, and
minimum-size layout. These use a simulated native bridge. Windows Go tests
verify child launch arguments (including spaces), pending project attachment,
initialization consent/cancellation, and refusal to replace an open workspace.
The actual native picker remains a manual check. An opt-in Windows native smoke
test now launches the production GUI binary with a disposable initialized project,
checks for a visible top-level window belonging to that child, and closes only
the test window. It reproduced the hidden-window failure and passed after removing
`HideWindow` from the interactive GUI launch. Background console tools retain
their existing hidden-window handling. Run it with:

```powershell
$env:AGENTTM_DESKTOP_SMOKE_BINARY = (Resolve-Path ./bin/desktop/AgentTM.exe).Path
go test ./cmd/agenttm-desktop -run '^TestNativeProjectWindowVisible$' -count=1 -v
Remove-Item Env:AGENTTM_DESKTOP_SMOKE_BINARY
```

This checks native window visibility; it does not automate the folder picker or
the initialization confirmation dialog.
