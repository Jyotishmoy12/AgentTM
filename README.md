# Agent Time Machine v0.1

A local Go CLI that records **real, AgentTM-managed noninteractive Codex runs**
in SQLite, with baseline/final workspace checkpoints and historical file inspection.
The embedded React/TypeScript UI displays real stored sessions, timelines,
historical files, parent diffs and isolated worktree forks. This implements Milestones 0–5 in
[the MVP specification](AGENT_TIME_MACHINE_MVP.md).

**Validation status:** real Windows end-to-end coding, tests, intermediate capture,
CLI/UI restoration, failure and Ctrl+C cancellation passed. Automated tests,
selected race checks and five browser tests pass. All six OS/architecture release
targets build; Windows installation was tested. Remote CI and native Linux/macOS
execution are configured but not claimed as observed here. See [release evidence](docs/release-checklist.md),
[Codex compatibility](docs/codex-compatibility.md), [snapshots](docs/snapshots.md),
[UI/API](docs/ui.md), and [fork safety/recovery](docs/fork-and-recovery.md).

## Release installation

Local archives are generated under `dist/0.1.0/`. Select the archive for your OS
and architecture, verify it against the matching `SHA256SUMS`, and extract the
single executable. Git 2.42+ and an authenticated Codex CLI are required for
recording. Go and Node are not needed to run the release executable.

The local installers verify archive checksums before installing; they do not
download anything. Windows example:

```powershell
.\scripts\install.ps1 -Archive .\dist\0.1.0\agenttm_0.1.0_windows_amd64.zip -AddToPath
```

PATH changes require `-AddToPath`; upgrades require `-Force`. If script execution
is disabled, extract the ZIP and invoke `agenttm.exe` directly. On Unix use
`sh scripts/install.sh archive.tar.gz [install-directory]`.

## Open your recorded history

From your initialized Git repository:

```powershell
$agenttm = 'C:\dev\AgentTM\bin\agenttm.exe'
& $agenttm ui
```

AgentTM opens `http://127.0.0.1:7331` in your browser. Keep the terminal running;
Ctrl+C stops the server. If the port is occupied, use `& $agenttm ui --port 7332`.
For an installed-app style launch with a Codex readiness check, run
`& $agenttm desktop`. It opens the same local UI and reports whether Codex is
installed and authenticated; existing history remains available when Codex is
not ready.
Use `--no-browser` to print the URL without opening it. No Node installation is
needed to run the prebuilt executable; all production assets are embedded.

Select a session, then a timeline event or checkpoint. **Files** shows the
historical tree and read-only Monaco viewer. **Compare with parent** shows changed
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
flags are passed. New configs enable best-effort scans near supported completed
command/file-change items; older config values are preserved. Use the flag above
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

| Command | Behavior |
| --- | --- |
| `init` | Idempotent config, directories, SQLite migrations and local Git exclusion |
| `version` | Version and build commit |
| `codex doctor` | Version, JSON capability and observable login readiness |
| `doctor` | Repository/config/database checks and Codex readiness |
| `run codex [--model MODEL] -- "task"` | Supervise real Codex and persist sanitized JSONL observations |
| `sessions` | List sessions, UTC timestamps, status and exit code |
| `events <id> [--after N] [--limit N]` | JSONL events ordered by per-session sequence; default 100, maximum 1000 |
| `checkpoints <session-id>` | Checkpoint IDs, kind, time, files and partial flags |
| `checkpoint <session-id>` | Manually observe the current workspace; reuse unchanged state |
| `show <checkpoint-id>` | Versioned manifest, file tree, hashes, modes and omissions as JSON |
| `cat <checkpoint-id> <path>` | Verified historical UTF-8 text, maximum 1 MiB output |
| `diff <checkpoint-id>` | JSON changes and bounded unified patches against parent (empty tree for baseline) |
| `fork <checkpoint-id> --name NAME [--allow-partial]` | Restore and verify a new isolated worktree |
| `forks` | List ready, restoring or failed fork records |
| `purge --session ID [--yes]` | Confirm logical deletion of an ended, unforked session; retain shared blobs |
| `ui [--port N] [--no-browser]` | Serve embedded read-only history on loopback and open your browser |

Unknown commands return exit code 2; operational failures return 1. Normal child
failure codes are forwarded; cancellation returns 130. Recording/protocol failure
returns nonzero even if the child exits zero. JSONL goes to stdout, recording status
to stderr. No executable or fixture simulates Codex during ordinary CLI usage.

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

- Only runs launched through `agenttm run codex` are captured. Existing interactive
  sessions are not observed.
- Baseline/final/manual scans and optional completed-tool observations capture
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
