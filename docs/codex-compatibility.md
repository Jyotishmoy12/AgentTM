# Codex event contract and validation

Checked on Windows on 2026-11-02 against installed `codex-cli 0.164.0-alpha.11.1`.
`codex exec --help` advertises `--json`, a stdin prompt (`-`) and `--model`.
Official reference: https://developers.openai.com/codex/noninteractive/
(redirects to https://learn.chatgpt.com/docs/non-interactive-mode).

AgentTM invokes `codex exec --json -`, optionally adding explicit `--model` and
`--sandbox read-only|workspace-write` choices. By default Codex configuration is
honored. No unsafe bypass, authentication or global configuration changes are made.
The repository is the child working directory and the prompt goes through stdin.

## Final v0.1 validation — passed on Windows

On 2026-11-02, real session `0144ca9f-871b-4412-9d50-8e85c95c5c42` used
`gpt-6.1-sol`, explicit `--sandbox workspace-write` and `--snapshot-after-tool=true`
in a disposable Go repository with spaces/Japanese characters in its path. Codex
modified `calc.go`, added meaningful `calc_test.go` tests and executed
`gofmt -w calc.go calc_test.go; go test ./...` with observed exit code 0 and output
`ok agenttm-demo 2.169s`. Native file-change/command events and usage were persisted.

AgentTM captured baseline `ac89d63b-8b5a-4061-8a64-c0554911fb24` (3 files) and
observed checkpoint `ffc08b72-e339-414c-ae59-eae4fc23a656` (4 files). Unchanged
subsequent observations/final scan reused that checkpoint. Both were forked through
the CLI; a baseline fork also succeeded through Chrome's confirmation dialog.
Restored hashes matched the manifests. Independent checks verified the original
HEAD, index bytes and working-file hashes stayed unchanged. The real history UI
displayed old/new code and the parent diff correctly.

An intentionally unavailable model produced failed session
`b8706351-6906-414b-9fae-687c2a2223d7`, exit 1, with baseline/final observations.
A real sleep task was interrupted through terminal Ctrl+C: session
`e80a045c-9f4f-4a1f-97da-390a0e402186` became `cancelled`, with exit code 130 and
a final workspace observation. The same process supervisor is covered by synthetic
success/failure/cancellation tests. No deterministic or atomic per-tool fidelity
is claimed; intermediate scans are explicitly labeled observations near events.

See [the sanitized sample excerpt](examples/real-recording.json) and
[release checklist](release-checklist.md). Earlier validation notes below are
historical and explain why the explicit workspace-write test was needed.

## Observed real events

The disposable real run emitted `thread.started` with `thread_id`, `turn.started`,
`item.completed` with an error item (`id`, `type`, `message`), `error` with `message`,
and `turn.failed` with `error.message`. The process exited 1.
`tests/fixtures/codex-real-failed.jsonl` contains these actual stdout records;
only the thread identifier was replaced. Stderr was excluded.

During initial Phase 1 validation, the default model
`gpt-5.5` was rejected for the configured ChatGPT account. A separate explicit
`gpt-5.3-codex` probe was also rejected. Network access inside the execution sandbox
was blocked; the outside-sandbox probes reached the service and returned the model
errors. The user subsequently verified a successful greeting using `gpt-6.1-sol`.

The parser also supports the documented `turn.completed` and item lifecycle
categories for command execution, file changes, and agent messages. Phase 2's
real run confirmed command execution, agent messages, usage and turn completion.
The final v0.1 check above also verified successful real file edits.
Unknown fields/events are omitted except for sanitized event type
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
available to your account to verify compatibility after CLI/account changes.

## Phase 2 real-run validation

On 2026-11-02, the built Phase 2 Windows executable ran a real Codex session with
`--model gpt-6.1-sol` in a disposable path containing spaces and Japanese characters.
Session `fd3d97ac-484e-4162-b982-1fca9c69514d` persisted 11 ordered records, including
baseline/final observations, `command_execution` started/completed records,
agent messages, `turn.completed`, usage, and supervisor exit code 0.

The requested test-file write was attempted by a real command but denied with
`UnauthorizedAccessException` under Codex's existing policy. The agent reported the
restriction. AgentTM correctly reused the unchanged baseline checkpoint for its
final observation. This is successful recording of a completed agent turn; it is
not successful completion of that file-edit request.

Manual mutations then changed the original file, added an eligible untracked file,
and added `.env`. An explicit `checkpoint` created a second immutable manifest,
marked partial with `.env` omitted. `cat` returned the baseline's original contents;
`doctor` passed with two checkpoints and three content objects. Automated tests
separately verify changed final state after successful/failed/cancelled synthetic
child processes, including a final scan after Ctrl+C-style cancellation.

## Recheck after upgrading Codex

1. Use the README quick start in a disposable Git repository.
2. Run a real task, choosing an available model with `--model` if needed.
3. Confirm `sessions` shows `completed` and `events` includes `turn.completed`.
4. Ask Codex to run a harmless command; inspect actual command lifecycle metadata.
5. Cancel a longer run with Ctrl+C; confirm `cancelled` and exit code 130.

Snapshots observe baseline/final state, manual scans and optional completed-tool
observations. Never infer atomic per-tool checkpoint fidelity from these scans.
