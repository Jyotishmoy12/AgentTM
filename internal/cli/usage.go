package cli

var Version = "0.1.0"
var Commit = "development"
var BuildDate = "development"

const usage = `AgentTM - local Codex history, checkpoints and safe forks

  agenttm init
  agenttm version
  agenttm doctor
  agenttm codex doctor
  agenttm run codex [--model MODEL] -- "task"
  agenttm sessions
  agenttm events <session-id> [--after N] [--limit N]
  agenttm operations <session-id> [--after N] [--limit N]
  agenttm checkpoints <session-id>
  agenttm checkpoint <session-id>
  agenttm show <checkpoint-id>
  agenttm cat <checkpoint-id> <repo-relative-path>
  agenttm diff <checkpoint-id>
  agenttm ui [--port 7331] [--no-browser]
  agenttm desktop [--port 7331] [--no-browser]
  agenttm fork <checkpoint-id> --name <name> [--allow-partial]
  agenttm forks
  agenttm purge --session <session-id> [--yes]
  agenttm gc [--min-age 24h] [--apply --yes]

Only runs launched through AgentTM are recorded. Forks never execute captured code.
Snapshots observe baseline/final state, not guaranteed per-tool history.
`
