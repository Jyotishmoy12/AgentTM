# CLI reference

For a first recording and a step-by-step inspection/restore walkthrough, start
with the [user guide](user-guide.md).

Commands below describe the current implementation. Run `agenttm help` to check
the commands in your installed release; native chat and backup controls require
the desktop preview.

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
or `agenttm operations <session-id>`. See [operation checkpoints](granular-checkpoints.md).
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
