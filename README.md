# Agent Time Machine — Phase 1

A local Go CLI that records **real, AgentTM-managed noninteractive Codex runs**
in SQLite. This implements the foundation and event-ingestion code for Milestones
0–1 in [the MVP specification](AGENT_TIME_MACHINE_MVP.md).

**Validation status:** foundation and synthetic integration tests are implemented.
Real Codex failure events were observed; a successful run is blocked by this
environment's account/model configuration. See [compatibility evidence](docs/codex-compatibility.md).
Milestone 1 is not acceptance-complete until a successful real run passes.

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
& $agenttm run codex -- "Reply with a short greeting. Do not change files."
& $agenttm sessions
# Copy the session UUID shown above:
& $agenttm events '<session-id>'
& $agenttm events '<session-id>' --after 10 --limit 50
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

Unknown commands return exit code 2; operational failures return 1. Normal child
failure codes are forwarded; cancellation returns 130. Recording/protocol failure
returns nonzero even if the child exits zero. JSONL goes to stdout, recording status
to stderr. No executable or fixture simulates Codex during ordinary CLI usage.

## Storage and privacy

`init` resolves the canonical Git root even from nested directories. It creates
`.agenttm/config.json`, `data/events.db`, `objects/`, and `logs/`. The SQLite store
uses transactions, foreign keys, WAL and a busy timeout. Objects are reserved for
the later snapshot milestone. Logs contain only a session outcome summary.

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
- **No snapshots, file restore, diff, worktree fork, HTTP API or web UI yet.** Those
  are Milestones 2–4. Snapshot/exclusion/server config fields are reserved and
  validated; they do not enable those features in Phase 1.
- Events are observations, not a complete tool trace or proof of file authorship.
  Separate receipts get separate UUIDs/sequences; no payload-hash deduplication.
- Graceful Ctrl+C is handled. Forced AgentTM termination or machine failure can
  leave a session `active`; `doctor` reports active sessions without assuming that
  a separate recorder has died. No crash-recovery rewrite is attempted.
- SQLite corruption is checked by `doctor`; blob checks await Milestone 2.
- Automated tests use synthetic subprocesses explicitly labeled as test fixtures.
  Actual Codex schema/failure evidence and remaining acceptance checks are in the
  compatibility document. CI is configured for Windows, Linux and macOS; remote
  CI execution has not been observed here.

Next: finish the successful real Codex acceptance check, then implement Milestone
2's content-addressed snapshot engine.
