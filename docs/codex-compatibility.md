# Codex event contract and validation

Checked on Windows on 2026-11-02 against installed `codex-cli 0.164.0-alpha.11.1`.
`codex exec --help` advertises `--json`, a stdin prompt (`-`) and `--model`.
Official reference: https://developers.openai.com/codex/noninteractive/
(redirects to https://learn.chatgpt.com/docs/non-interactive-mode).

AgentTM invokes `codex exec --json -`, or adds the user's explicit `--model`.
The repository is the child working directory. No approval, sandbox, authentication,
or user configuration overrides are passed. The prompt goes through stdin.

## Observed real events

The disposable real run emitted `thread.started` with `thread_id`, `turn.started`,
`item.completed` with an error item (`id`, `type`, `message`), `error` with `message`,
and `turn.failed` with `error.message`. The process exited 1.
`tests/fixtures/codex-real-failed.jsonl` contains these actual stdout records;
only the thread identifier was replaced. Stderr was excluded.

Successful integration is **blocked in this environment**: the default model
`gpt-5.5` was rejected for the configured ChatGPT account. A separate explicit
`gpt-5.3-codex` probe was also rejected. Network access inside the execution sandbox
was blocked; the outside-sandbox probes reached the service and returned the model
errors. No successful model response or real tool execution is claimed.

The parser also supports the documented `turn.completed` and item lifecycle
categories for command execution, file changes, and agent messages. Those success
paths are covered by synthetic tests and must still be verified on a successful
real run. Unknown fields/events are omitted except for sanitized event type
metadata. Reasoning item content is omitted. No timestamps or tool identifiers are
invented; `received_at` and sequence are AgentTM observations.

The built Windows executable was also tested end to end through `init`, `run`,
`sessions`, `events`, and `doctor` in a disposable repository. It persisted seven
ordered records (start, five real Codex records, process exit), session status
`failed`, and exit code 1. Database integrity and observable login readiness
passed. This validates failure recording, not a successful coding task.

`go test ./...` and `go vet ./...` pass locally. Windows/amd64, Linux/amd64 and
macOS/arm64 binaries compile; non-Windows binaries were not executed here.

`codex doctor` checks availability, advertised JSON support and `login status`.
It cannot prove model access or network connectivity. Run the wrapper with a model
available to your account to finish the integration milestone.

## Local verification still required

1. Use the README quick start in a disposable Git repository.
2. Run a real task, choosing an available model with `--model` if needed.
3. Confirm `sessions` shows `completed` and `events` includes `turn.completed`.
4. Ask Codex to run a harmless command; inspect actual command lifecycle metadata.
5. Cancel a longer run with Ctrl+C; confirm `cancelled` and exit code 130.

Snapshots and UI checks belong to later milestones. Never infer per-tool
checkpoint fidelity from this event-only implementation.
