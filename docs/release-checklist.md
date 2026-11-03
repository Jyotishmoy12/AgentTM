# v0.1 release evidence and remaining platform validation

**Historical evidence:** this document records v0.1 validation. Its feature limits
and remote-release status are not current. For v0.3.0 downloads and the latest
local packaging audit, use [the pre-launch audit](launch-audit.md).

Implementation milestones 0–5 are present. This checklist distinguishes observed
results from CI configuration and future features; it is not a claim that every
OS/environment has been exercised locally.

| Check | Observed result |
| --- | --- |
| Go unit/integration tests and vet | Passed on Windows |
| Storage/fork/server race tests | Passed using `go test -race` |
| Frontend TypeScript build and state tests | Passed |
| Browser UI tests | Five passed in isolated Chrome, including real worktree creation |
| Real Codex edits + tests | Passed with `gpt-6.1-sol`, explicit workspace-write sandbox |
| Real command/file events + intermediate observation | Persisted; changed checkpoint found |
| Baseline/final restore and source preservation | Hashes, original HEAD/index/files verified |
| Real history code/diff + UI fork | Passed in Chrome against the actual successful recording |
| Failed real Codex run | Failed/exit 1 persisted, final scan retained |
| Ctrl+C during real Codex run | Cancelled/exit 130 persisted, final scan retained |
| Crash during production object staging | Force-killed child; doctor reported temporary file and lock |
| Partial/corrupt snapshots, names and symlinks | Refusal/diagnostics tested; symlink tests depend on OS privileges |
| Git hook suppression and ambient-index protection | Tested against installed post-checkout/reference-transaction hooks and Git overrides |
| Release cross-builds | Windows/Linux/macOS × amd64/arm64 compile and package |
| Windows checksum installer | Installed and executed a release binary without PATH/policy changes |
| Native Linux/macOS tests/installation | Configured in CI; not observed on this Windows host |
| Remote GitHub CI/release execution | Workflow prepared; not triggered/published from this session |

The successful real session and sanitized sample are documented in
`codex-compatibility.md` and `examples/real-recording.json`. Raw model streams,
private reasoning and credentials are not included. The sample is a readable
excerpt, not a portable recording import feature. For a reproducible synthetic
browser fixture, use `npm run test:e2e`; those sessions are labeled `synthetic-test`.

## Build/package

After frontend changes, run `npm ci`, `npm test`, `npm run build` in `web`, then
`go test ./...`, `go vet ./...`, and `go build -o bin/agenttm.exe ./cmd/agenttm`.
`go run ./cmd/release --version 0.1.0 --out dist/0.1.0` creates all six archives
and `SHA256SUMS`. Output files are exclusive; select a fresh directory to rebuild.
Release executables embed version, commit/dirty marker, build time and Go runtime
information. Build timestamps mean builds are not claimed bit-for-bit identical.

CI tests native Windows/Linux/macOS behavior, adds Linux race/browser checks, and
checks native archive installation. The release workflow publishes each archive,
the checksum manifest, and installer scripts as individual assets on the GitHub
Release for a tag or manual dispatch. Signing remains an owner-controlled step.

## Revalidate on a new Codex version

1. Run `agenttm codex doctor`, inspect its version/capability warning, and authenticate.
2. In a disposable committed Go repo, record a small edit/test task. Use an explicit
   workspace-write choice if the existing policy is read-only; do not use bypass flags.
3. Check native tool records, changed paths, baseline/observed/final linkage and hashes.
4. Inspect contents/diff in the UI; fork both older and newer checkpoints.
5. Compare the original HEAD, index and file hashes; check failure and Ctrl+C behavior.
6. Run `doctor`. Review omissions/metadata limitations before relying on a restore.

Known v0.1 limits remain explicit: no interactive-session capture, other-agent
adapters, hidden reasoning, deterministic replay, restoration of external state,
automated continuation, cloud sync, encrypted backup or automatic blob GC.
