# Agent Time Machine (AgentTM)

A local workspace history and debugging tool for AI coding agents. AgentTM records
Codex sessions, captures workspace checkpoints, and lets you inspect earlier files
or restore them into a separate Git worktree.

Use the CLI and embedded browser dashboard, or the native Windows desktop preview
with interactive Codex chat. History stays on your device; Codex connects to its
configured service to run your requests.

![AgentTM overview with sidebar navigation and recorded sessions](docs/images/overview.png)

## Features

| Feature | What you can do |
| --- | --- |
| Recorded Codex sessions | Record managed CLI runs and desktop chat turns; inspect events, supported tool output, timestamps, and outcomes. |
| Operation checkpoints | Capture before/after observations for supported command execution, file change, MCP, and dynamic tool operations. Each supported completion gets a distinct checkpoint, including no-ops. |
| Capture coverage | Inspect overlaps, missing notifications, partial snapshots, interruptions, and failures in **Sessions → Operations**. |
| Historical files | Browse captured files in a read-only Monaco editor without changing the current workspace. |
| Checkpoint diffs | Inspect additions, deletions, modifications, and file mode changes against a checkpoint's parent. |
| Isolated restoration | Restore checkpoint files into a separate Git worktree while preserving the original workspace, index, and HEAD. |
| Interactive chat | Chat with Codex inside the Windows desktop app, discover models, choose permissions, and review supported tool approvals. |
| Conversation continuation | Explicitly continue a recorded Codex conversation using its saved upstream thread. |
| Setup guidance | Check Codex readiness and select its executable when discovery fails. |
| Encrypted history backups | Create and restore passphrase-encrypted `.age` history backups through the desktop app. |
| Blob garbage collection | Preview unreferenced file blobs and explicitly remove eligible objects without deleting referenced history. |
| Content deduplication | Share identical SHA-256 file objects across checkpoints and sessions. |
| Local storage and diagnostics | Store history in SQLite and immutable manifests; verify stored objects and links with `doctor`. |

**Availability:** this list describes the current source checkout. Previously
published v0.1 archives may contain an earlier feature set. The release workflow
currently packages the **CLI and browser dashboard**, not the native desktop
executable. Build the Windows desktop preview from source for desktop chat and
backup tools.

Checkpoints are notification-time workspace observations, not atomic snapshots or
proof that one action authored a change. Codex and other writers are not paused.
See [operation checkpoints](docs/granular-checkpoints.md) for coverage limits.
Code provenance and checkpoint-based conversation forking remain future work;
continuing a conversation does not rewind its context to a selected checkpoint.

## Screenshots

These screenshots show the current UI using demo/test data. They illustrate the
interface rather than evidence of a real model execution.

<details>
<summary>Session timeline and recorded tool activity</summary>

![AgentTM session timeline with event filters and tool activity details](docs/images/session-timeline.png)

Browse recorded events and inspect the workspace checkpoint observed near an event.

</details>

<details>
<summary>Interactive Codex chat</summary>

![AgentTM chat with conversation, model, permissions, and message controls](docs/images/codex-chat.png)

Start a conversation or continue a recorded one from the Windows desktop app.

</details>

<details>
<summary>Encrypted backups and blob cleanup</summary>

![AgentTM storage page with encrypted backup controls and unused blob preview](docs/images/storage-backups.png)

Protect recorded history with an encrypted backup and preview unused blobs before cleanup.

</details>

## Install from GitHub

### Choose your download

1. Open [GitHub Releases](https://github.com/Jyotishmoy12/AgentTM-demo/releases).
2. Select a release and expand **Assets**.
3. Download **one** archive for your device, plus `SHA256SUMS` and your platform's installer.
4. Keep those files together in one folder. `VERSION` below means the version shown on that release.

| Device | Archive | Installer |
| --- | --- | --- |
| Windows, Intel/AMD 64-bit | `agenttm_VERSION_windows_amd64.zip` | `install.ps1` |
| Windows, ARM64 | `agenttm_VERSION_windows_arm64.zip` | `install.ps1` |
| macOS, Apple silicon | `agenttm_VERSION_darwin_arm64.tar.gz` | `install.sh` |
| macOS, Intel | `agenttm_VERSION_darwin_amd64.tar.gz` | `install.sh` |
| Linux, Intel/AMD 64-bit | `agenttm_VERSION_linux_amd64.tar.gz` | `install.sh` |
| Linux, ARM64 | `agenttm_VERSION_linux_arm64.tar.gz` | `install.sh` |

The **Source code** downloads contain the repository, not a prebuilt application.
If no release is listed, a maintainer must run **Actions → Release archives → Run
workflow** to publish one. Passing CI alone does not publish a release.

Git 2.42+ is required for project operations. Recording also requires an installed,
authenticated Codex CLI. Go and Node.js are not needed to run the prebuilt CLI.

### Windows (PowerShell)

Open PowerShell **in the folder containing the downloaded files**. For version
`0.1.0` on an Intel/AMD Windows device:

```powershell
# Change this to the release version you downloaded.
$version = '0.1.0'
Unblock-File -LiteralPath .\install.ps1
.\install.ps1 -Archive ".\agenttm_${version}_windows_amd64.zip" -ChecksumFile .\SHA256SUMS -AddToPath
agenttm version
```

Use `windows_arm64` for an ARM64 device. The installer verifies SHA-256 before
installing to `%LOCALAPPDATA%\AgentTM\bin`. `-AddToPath` updates your user PATH and
the current terminal; open a new terminal in other apps to pick up the change.
Add `-Force` to explicitly replace an existing installation.

If your execution policy still blocks the installer, verify the archive's hash
against its matching entry in `SHA256SUMS`, then extract and run it directly:

```powershell
Get-FileHash -LiteralPath ".\agenttm_${version}_windows_amd64.zip" -Algorithm SHA256
Get-Content -LiteralPath .\SHA256SUMS
# After confirming the hashes match:
Expand-Archive -LiteralPath ".\agenttm_${version}_windows_amd64.zip" -DestinationPath .\agenttm-windows
& .\agenttm-windows\agenttm.exe version
```

Use the executable's full path for later commands if you did not add it to PATH.
For example, assign it to `$agenttm` and invoke it with `& $agenttm version`.

### macOS and Linux

Open a terminal in the download folder and use the matching archive from the table.
For example, on Linux amd64:

```sh
sh install.sh agenttm_0.1.0_linux_amd64.tar.gz "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
agenttm version
```

Change the version and platform to match your download. The installer verifies
SHA-256 before installing. Add `~/.local/bin` to your shell's PATH configuration
to keep the command available in future terminals. The Unix installer refuses to
overwrite an existing executable; move the old one aside before upgrading.
Neither installer downloads dependencies or Codex for you.

### First recording

Open the Git project you want to record. For a new disposable folder, run `git init`
first; an initial commit is not required.

```powershell
agenttm init
agenttm codex doctor
agenttm doctor
agenttm run codex -- "Explain this project. Do not change files."
agenttm sessions
agenttm ui
```

If Codex reports a model access error, pass `--model MODEL_ID` with a model available
to your account. AgentTM does not change your global model configuration.

### Native Windows desktop preview from GitHub source

Requires Go 1.25+, Node.js 24+, Git, and the Microsoft Edge WebView2 runtime. Codex
is needed to chat; the desktop setup guide checks its readiness.

```powershell
git clone https://github.com/Jyotishmoy12/AgentTM-demo.git
Set-Location AgentTM-demo
Set-Location web
npm.cmd ci
npm.cmd run build
Set-Location ..
go build -o .\bin\agenttm.exe .\cmd\agenttm
.\bin\agenttm.exe init
.\scripts\desktop.ps1
```

The script builds and opens `bin\desktop\AgentTM.exe`. For later launches, run that
executable from an initialized Git project's working directory. Use
`scripts\desktop.ps1 -BuildOnly` to build without opening a window.

In **Chat with Codex**, start with **Read only**, then choose **Allow project edits**
when needed. **Model settings** lets you refresh models or choose `codex.exe`
directly. **Storage & backups** provides encrypted history backups and cleanup
previews. See [desktop chat and storage](docs/chat-and-storage.md) for details.

## Open your recorded history

From your initialized Git repository:

```powershell
$agenttm = Join-Path $env:LOCALAPPDATA 'AgentTM\bin\agenttm.exe'
& $agenttm ui
```

AgentTM opens `http://127.0.0.1:7331` in your browser. Keep the terminal running;
Ctrl+C stops the server. If the port is occupied, use `& $agenttm ui --port 7332`.
For a browser launch with a Codex readiness check, run
`& $agenttm desktop`. It opens the same local UI and reports whether Codex is
installed and authenticated; existing history remains available when Codex is
not ready. This CLI command opens a browser; the native Windows app is the separate
`bin\desktop\AgentTM.exe` described above.
Use `--no-browser` to print the URL without opening it. No Node installation is
needed to run the prebuilt executable; all production assets are embedded.

Select a session, then a timeline event or checkpoint. **Files** shows the
historical tree and read-only Monaco viewer. **Changes** shows changed
paths and unified patches. Activity shows sanitized event input/output and the
observed checkpoint. An event without a checkpoint displays the last known
workspace with an explicit label; events preceding the baseline show no state.
**Fork checkpoint** shows the exact destination, branch and partial-snapshot
warnings before confirmation. Restored files live under `.agenttm/worktrees/`;
the original working tree, index and HEAD stay unchanged. No restored code runs.

## Build and test (PowerShell)

Requires Go 1.25+, Git and an installed/authenticated Codex CLI. SQLite is bundled
through a pure Go driver; no SQLite install or C compiler is required.

```powershell
cd C:\dev\AgentTM
go test ./...
go vet ./...
go build -o .\bin\agenttm.exe .\cmd\agenttm
.\bin\agenttm.exe version
.\bin\agenttm.exe codex doctor
```

On macOS/Linux: `go build -o bin/agenttm ./cmd/agenttm`.

The checked-in assets under `internal/server/ui` allow Go-only builds. After
changing frontend source, rebuild the embedded assets first (Node 24+):

```powershell
Set-Location C:\dev\AgentTM\web
npm.cmd ci
npm.cmd test
npm.cmd run build
Set-Location ..
go build -o .\bin\agenttm.exe .\cmd\agenttm
```

## Try it in a disposable repository

The source folder need not be a Git repository to build the executable.
The repository you record **must** be a Git working tree. No commit is required.

```powershell
$agenttm = 'C:\dev\AgentTM\bin\agenttm.exe'
$demo = Join-Path $env:TEMP ('agenttm-demo-' + [guid]::NewGuid())
New-Item -ItemType Directory $demo | Out-Null
Set-Location $demo
git init
& $agenttm init
& $agenttm doctor
Set-Content -LiteralPath snapshot-demo.txt -Value 'Original content'
& $agenttm run codex --model gpt-6.1-sol -- "Reply with a short greeting. Do not change files."
& $agenttm sessions
# Copy the session UUID shown above:
& $agenttm events '<session-id>'
& $agenttm events '<session-id>' --after 10 --limit 50
& $agenttm checkpoints '<session-id>'
# Copy the baseline checkpoint UUID shown above:
& $agenttm cat '<baseline-id>' snapshot-demo.txt

# Explicitly observe a manual change, without another model request:
Set-Content -LiteralPath snapshot-demo.txt -Value 'Changed content'
& $agenttm checkpoint '<session-id>'
# Copy the new checkpoint UUID:
& $agenttm diff '<new-checkpoint-id>'
& $agenttm cat '<baseline-id>' snapshot-demo.txt   # still Original content
& $agenttm cat '<new-checkpoint-id>' snapshot-demo.txt
& $agenttm show '<new-checkpoint-id>'
& $agenttm fork '<new-checkpoint-id>' --name alternative
& $agenttm forks
```

If your configured model is unavailable, explicitly choose one available to your
Codex account (this does not change global settings):

```powershell
& $agenttm run codex --model '<available-model>' -- "Reply with a short greeting."
```

Then try a real coding task in that disposable repo. Codex's existing permissions,
sandbox, rules, hooks and authentication apply. AgentTM does not grant write access
or bypass approval policy. Tasks may fail or be refused under those policies.
Ctrl+C cancels the child process tree and attempts to persist cancellation status.
The default honors Codex's existing sandbox/approval configuration. To explicitly
allow a coding task to write inside a disposable repository:

```powershell
& $agenttm run codex --model gpt-6.1-sol --sandbox workspace-write --snapshot-after-tool=true -- "Implement a small function and test it."
```

`read-only` is the other supported explicit sandbox override. No unsafe bypass
flags are passed. New configs enable scans at supported command/file-change/MCP/dynamic
tool boundaries; older config values are preserved. Each completion gets its own
checkpoint, including no-op tools. Inspect before/after coverage in **Sessions → Operations**
or `agenttm operations <session-id>`. See [operation checkpoints](docs/granular-checkpoints.md).
Use the flag above
or `capture.snapshot_after_tool` to enable them. They do not pause Codex or prove
per-tool causality.
The final workspace scan uses a separate two-minute cleanup context, including
after cancellation or Codex failure. No change means the existing checkpoint is
reused; the final observation event still links to it. Older Phase 1 sessions
have no historical files. `checkpoint` observes the workspace **now**, even when
linked to an older session; it does not reconstruct its past.

Use `& $agenttm` in PowerShell; assigning a path to a variable does not install a
bare `agenttm` command. `codex --version` must also work in that terminal. If
Codex is only bundled with VS Code, add its executable directory to that terminal's
`$env:PATH`, or install the standalone CLI.

## Available commands

Run these from your Git project. Prefix each command with `agenttm`, or use
`& $agenttm` when invoking a PowerShell executable-path variable. This table
describes the current source; older release binaries may expose fewer commands.

| Command | Behavior |
| --- | --- |
| `help` | Show CLI usage |
| `init` | Idempotent config, directories, SQLite migrations and local Git exclusion |
| `version` | Version and build commit |
| `codex doctor` | Version, JSON capability and observable login readiness |
| `doctor` | Repository/config/database, checkpoint/object integrity, operation links, and Codex readiness |
| `run codex [--model MODEL] [--sandbox read-only\|workspace-write] [--snapshot-after-tool=true] -- "task"` | Supervise Codex and persist sanitized events and workspace observations |
| `sessions` | List sessions, UTC timestamps, status and exit code |
| `events <id> [--after N] [--limit N]` | JSONL events ordered by per-session sequence; default 100, maximum 1000 |
| `operations <session-id> [--after N] [--limit N]` | JSONL operation coverage, before/after checkpoint IDs, and observed changed paths; default 50, maximum 100 |
| `checkpoints <session-id>` | Checkpoint IDs, kind, time, files and partial flags |
| `checkpoint <session-id>` | Manually observe the current workspace; reuse unchanged state |
| `show <checkpoint-id>` | Versioned manifest, file tree, hashes, modes and omissions as JSON |
| `cat <checkpoint-id> <path>` | Verified historical UTF-8 text, maximum 1 MiB output |
| `diff <checkpoint-id>` | JSON changes and bounded unified patches against parent (empty tree for baseline) |
| `fork <checkpoint-id> --name NAME [--allow-partial]` | Restore and verify a new isolated worktree |
| `forks` | List ready, restoring or failed fork records |
| `purge --session ID [--yes]` | Confirm logical deletion of an ended, unforked session; retain shared blobs |
| `ui [--port N] [--no-browser]` | Serve embedded read-only history on loopback and open your browser |
| `desktop [--port N] [--no-browser]` | Check Codex readiness and open the browser dashboard |
| `gc [--min-age 24h]` | Preview eligible unreferenced blobs without deleting them |
| `gc [--min-age 24h] --apply --yes` | Explicitly remove eligible unreferenced blobs |

Interactive chat, explicit conversation continuation, and encrypted backup/restore
are desktop actions, not CLI subcommands. Unattended continuation loops are not
implemented. Event and operation pagination use exclusive cursors.

Unknown commands return exit code 2; operational failures return 1. Normal child
failure codes are forwarded; cancellation returns 130. Recording/protocol failure
returns nonzero even if the child exits zero. JSONL goes to stdout, recording status
to stderr. No executable or fixture simulates Codex during ordinary CLI usage.

## AgentTM compared with Git

AgentTM works alongside Git. Keep using Git for reviewed commits, branches,
collaboration, and durable project history.

This table describes the current source, including the Windows desktop preview.
Older published release binaries may contain fewer features.

| Feature | Git | AgentTM |
| --- | --- | --- |
| 1. Track source code changes | ✅ | ✅ |
| 2. View historical file versions | ✅ | ✅ |
| 3. Compare code differences | ✅ | ✅ |
| 4. Restore previous code states | ✅ | ✅ |
| 5. Record execution history for AgentTM-managed Codex sessions | ❌ | ✅ |
| 6. Capture supported tool-call events reported by Codex | ❌ | ✅ Sanitized, bounded records |
| 7. Track commands reported in supported Codex execution events | ❌ | ✅ Managed recordings only |
| 8. Record supported Codex session events | ❌ | ✅ Managed CLI runs and desktop chat |
| 9. Associate checkpoints with received agent activity | ❌ | ✅ Observational links, not causal attribution |
| 10. Capture eligible workspace files without commits | Not automatically | ✅ When capture is enabled; scan-time observations, not atomic snapshots |
| 11. Visualize recorded agent event timelines | ❌ | ✅ |
| 12. Restore checkpoints into isolated worktrees | ✅ Manually | ✅ Integrated |
| 13. Record reported agent failures and recording interruptions | ❌ | ✅ Events and status; no automatic root-cause diagnosis |
| 14. Identify which agent action introduced a specific line | ❌ | 🔜 Planned |
| 15. Fork and continue an agent session from a checkpoint | ❌ | 🔜 Planned |
| 16. Support multiple AI coding agents | N/A | 🔜 Planned |
| 17. Analyze agent retries and performance | ❌ | 🔜 Planned |
| 18. Reproduce identical AI reasoning | ❌ | ❌ |

Agent-related comparisons refer to built-in agent execution recording. Git's
`blame` provides commit/line history, not causal attribution to an agent tool call.
AgentTM coverage applies to supported operations in managed recordings; checkpoints
remain workspace observations, and planned features are not currently implemented.

## Storage and privacy

`init` resolves the canonical Git root even from nested directories. It creates
`.agenttm/config.json`, `data/events.db`, `objects/`, and `logs/`. The SQLite store
uses transactions, foreign keys, WAL and a busy timeout. Snapshots use SHA-256
objects and versioned JSON manifests under `.agenttm/manifests/`; SQLite indexes
the manifest checksum and checkpoint/event links. Logs contain only a session
outcome summary. Schema 1 databases migrate automatically without losing events.

Only `.git/info/exclude` is updated, with `/.agenttm/`. Tracked `.gitignore`, the
index and HEAD are untouched. Existing local storage symlinks are rejected.
Restrictive modes are requested on POSIX; Windows ACLs are inherited. Other users
with filesystem access can read the local recording data.

Prompt capture defaults to `metadata_only`. The complete task text is removed if
echoed in event strings; fragments/paraphrases may still appear in outputs. To opt
into sanitized prompt storage set `capture.prompt_mode` to `sanitized` in config.
Prompts use stdin rather than OS process arguments. Raw events are not persisted.
Known credential patterns are redacted before storage; this is best-effort and
cannot identify every secret. Review recordings before sharing them.
File objects preserve exact bytes and are **not content-redacted**. Snapshot
privacy depends on filename/directory exclusions; credentials embedded in source
code can still be captured. Inspect `show` for exclusions and partial flags.

Event storage uses an allowlist of observable fields. Reasoning item text and
unknown event bodies are omitted. Payloads are bounded by
`capture.max_event_payload_bytes` (default 64 KiB), with explicit truncation flags.
Malformed/oversized JSONL lines produce omission records; parsing resumes at the
next line. Raw stderr is drained to a discard sink for privacy, so startup failures
that appear only on stderr require a direct Codex diagnostic run. No AgentTM
telemetry or uploads are implemented; Codex itself uses its configured service.

## Current limits

- Only runs launched through `agenttm run codex` and AgentTM desktop chat turns
  are captured. External interactive sessions are not passively monitored.
- Baseline/final/manual scans and supported operation-boundary observations capture
  scan-time state; continuous or deterministic per-tool history is not claimed.
  Failed restore directories are retained for diagnosis.
- Events are observations, not a complete tool trace or proof of file authorship.
  Separate receipts get separate UUIDs/sequences; no payload-hash deduplication.
- Graceful Ctrl+C is handled. Forced AgentTM termination or machine failure can
  leave a session `active`; `doctor` reports active sessions without assuming that
  a separate recorder has died. No crash-recovery rewrite is attempted.
- `doctor` checks SQLite, manifests, object hashes and observation links. Interrupted
  writes can leave unreferenced files or a stale snapshot lock; these are reported
  without automatic deletion. See the snapshot recovery guide.
- Automated tests use synthetic subprocesses explicitly labeled as test fixtures.
  Actual Codex schema/failure evidence and remaining acceptance checks are in the
  compatibility document. CI is configured for Windows, Linux and macOS; remote
  CI execution has not been observed here.

## Build release archives

```powershell
go run ./cmd/release --version 0.1.0 --out dist/0.1.0
```

Rebuild the frontend first after UI source edits. The packager creates Windows,
Linux and macOS archives for amd64/arm64 plus `SHA256SUMS`, notices and restore
guidance. Existing outputs are refused; use a new output directory for a new build.
CI runs native tests across all three OSes and browser tests on Linux. The manual
release workflow publishes the individual archives to the
repository's GitHub Releases page, so users can download only their platform's
archive.

The Windows desktop preview now includes interactive Codex chat, explicit
conversation continuation, encrypted history backup/restore, and blob garbage
collection. See [chat and storage](docs/chat-and-storage.md) for usage, limits,
and validation. These features are not yet in the previously published v0.1
archives; rebuild the desktop preview to try them.

Additional agents, unattended continuation loops, and cloud sync remain deferred.
