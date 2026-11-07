# Development and release validation

Maintainer build documentation for the public AgentTM repository. Original
AgentTM source is proprietary; public visibility is not an open-source license.
See [licensing details](licensing.md) for reuse and contribution permissions.

## Build and test (PowerShell)

Requires Go 1.25+ and Git. An installed/authenticated Codex CLI is needed for real
recordings, not ordinary unit tests. SQLite is bundled
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


## Go refactoring checks

`go.uber.org/goleak` is pinned at `v1.3.0` in the module. It is reserved for
test imports; installing it does not automatically enable leak checks. Add
checks to the package being refactored, preserving any existing subprocess
branches in `TestMain`. Use package-level verification for parallel tests and
avoid broad goroutine exclusions that could hide real leaks.

The Windows desktop shell now enables package-scoped leak verification in
`cmd/agenttm-desktop/leaks_windows_test.go`. Run
`go test -count=1 ./cmd/agenttm-desktop` on Windows. Its tests cover active-turn
shutdown, model-discovery cleanup, project selection, and bridge compatibility.
The shell's Go source and test files are limited to 200 lines each, enforced by
a package test. Refactor selected files in focused steps; do not spread leak
checks or unrelated changes across the repository automatically.

The release packager also has isolated leak verification and a 200-line limit
for its Go files. Run `go test -count=1 ./cmd/release` for archive, checksum,
flag, build-command, and verification regressions. Local packaging with
`go run ./cmd/release` builds and verifies files only; it does not publish them.

For agent adapters, use `go test -count=1 ./internal/agents/...`. Leak checks run
only in those packages, and a recursive test enforces the 200-line limit across
their Go files. The Codex subprocess fixture covers availability, stream limits,
failed/incomplete turns, cancellation, and sink failures without invoking a real
Codex installation or sending prompts to a service.

For checkpoint observation, use `go test -count=1 ./internal/capture`. Its scoped
leak checks and 200-line limit accompany regressions for operation identity,
duplicate links, partial captures, preview bounds, failure handling, and
run-scoped interruption. Related CLI, interactive, snapshot, storage, and server
tests validate the existing capture integrations.

For CLI commands, use `go test -count=1 ./internal/cli`. Package-scoped leak
verification retains the synthetic Codex child flow. Tests cover exit codes,
argument validation, recording locks, prompt metadata, operation cursors, and
baseline/final capture failures. All CLI Go files are limited to 200 lines.

For configuration, use `go test -count=1 ./internal/config`. Scoped leak checks
and regression tests preserve default JSON, partial overrides, strict decoding,
privacy/storage limits, exclusion patterns, loopback restrictions, and the
200-line Go-file limit.

For internal desktop services, use `go test -count=1 ./internal/desktop`.
Scoped leak checks cover project opening, environment diagnostics, restored
folder safety, launcher switching, and embedded welcome assets. Go, HTML, CSS,
and JavaScript files in this folder are limited to 200 lines each.

For isolated checkpoint restoration, use `go test -count=1 ./internal/fork`.
Scoped leak checks cover restoration, cancellation, maintenance locks and failure
retention. Use `go test -race -count=1 ./internal/fork` for the same tests under
the race detector. Tests create disposable repositories and verify the original
workspace, index and HEAD stay unchanged.

For event handling, use `go test -count=1 ./internal/events`. Scoped leak checks
cover credential replacement groups, nested sanitization, usage counters,
payload budgets, and JSONL limits/errors. Event Go files are limited to 200 lines.

For desktop conversations, use `go test -count=1 ./internal/interactive` and
`go test -race -count=1 ./internal/interactive`. Scoped leak checks preserve the
synthetic App Server child process. Tests cover continuation, approvals,
cancellation, protocol failures, prompt privacy and recording finalization.
Go files are limited to 200 lines. Live model tests remain opt-in.

For backup, restore, purge and storage cleanup, use
`go test -count=1 ./internal/maintenance` or add `-race` for concurrency checks.
Package-scoped goleak runs after the tests. Coverage includes authenticated
backup round-trips, unsafe/truncated entries, cancellation cleanup, maintenance
locks, shared blobs, stale cleanup previews and corrupt history. Maintenance Go
files are limited to 200 lines; tests use disposable repositories.

For operation locks, run `go test -count=1 ./internal/operation`, or add `-race`.
Scoped goleak covers the tests for exclusive ownership, independent lock names,
release/reacquisition and refusal of stale or unsafe locks. A disposable child
process is force-killed to verify its lock remains available for diagnosis.
The lock API is unchanged, and all package Go files stay within 200 lines.

For process management, run `go test -count=1 ./internal/process` or add `-race`.
Scoped goleak accompanies cancellation and process cleanup tests. Native Windows
tests also verify hidden consoles and descendant termination. Unix-specific
tests verify process-group setup and window-helper behavior; run them on native
Linux/macOS runners, since cross-compilation alone does not execute the tests.
Required build tags remain; all Go files are limited to 200 lines.

For project discovery and initialization, run `go test -count=1 ./internal/project`
or add `-race`. Scoped goleak accompanies tests for Git environment isolation,
configuration/exclude preservation, cancellation and protected-path safety.
Related restoration tests verify the original workspace, index and HEAD remain
unchanged. Project Go files are limited to 200 lines.

For workspace snapshots, run `go test -count=1 ./internal/snapshot` or add `-race`.
Scoped goleak retains the force-kill persistence fixture. Tests cover immutable
history, deduplicated blobs, operation boundaries, partial captures, exclusions,
bounded diffs, integrity checks, cancellation and publication rollback. All Go
files in the package stay within 200 lines. Workspace observations retain their
existing limits; the refactor does not make captures atomic or deterministic.

For SQLite history storage, run `go test -count=1 ./internal/storage` or add
`-race`. Package-scoped goleak verifies cleanup after migration, query and
concurrent-writer tests. Coverage includes migration rollback, newer-schema
rejection, canonical project identity, event sequencing and operation cursors.
The existing schema, SQL migrations and query semantics are preserved. Go files
are limited to 200 lines; required migration embed directives remain.

For the HTTP server, run `go test -count=1 ./internal/server` or add `-race`.
Package-scoped goleak checks run automatically. Tests cover loopback listener
shutdown, caller-owned database preservation, canceled API-slot waiters,
browser and desktop request security, pagination, restoration and historical
file integrity. The server, endpoint handlers, response helpers and request
types are separated into focused files. All server Go files, including test
fixtures, stay within 200 lines. The frontend embed directive remains required.

For maintainer scripts, run these from the repository root:

```powershell
node --test scripts/tests/docs.test.mjs scripts/tests/smoke-ui.test.mjs scripts/tests/contracts.test.mjs
./scripts/test-scripts.ps1
```

The Node tests use the standard library and cover documentation links, dashboard
validation and child cleanup. PowerShell tests parse every `.ps1`, preserve entry
parameters and exercise a standalone installer with disposable ZIP fixtures.
These checks do not request a real model or modify user PATH. CI runs both test
suites, with PowerShell validation on Windows. Script source and test files stay
within 200 lines; installers remain self-contained downloads.

`sh -n scripts/install.sh` and `sh -n scripts/test-install.sh` validate shell
syntax. Use `sh scripts/test-install.sh ASSET_DIR VERSION PLATFORM --extract-only`
to check archive extraction, checksums and overwrite refusal without executing
a foreign-platform binary. Native Linux/macOS installation still requires those
platform runners. Desktop startup smoke tests require Windows and WebView2.

Staticcheck is a separate development executable pinned at `v0.8.2`. This
tool version requires Go 1.26+; it does not change AgentTM's `go.mod` directive.
Install from the repository root (PowerShell):

```powershell
$previousGoBin = $env:GOBIN
try {
    $env:GOBIN = Join-Path (Get-Location).Path 'bin\tools'
    go install honnef.co/go/tools/cmd/staticcheck@v0.8.2
    if ($LASTEXITCODE -ne 0) { throw 'Staticcheck installation failed.' }
} finally {
    $env:GOBIN = $previousGoBin
}
```

Run the installed tool:

```powershell
.\bin\tools\staticcheck.exe -version
.\bin\tools\staticcheck.exe ./...
```

For macOS/Linux, use `GOBIN="$PWD/bin/tools" go install
honnef.co/go/tools/cmd/staticcheck@v0.8.2` (one command), then
`./bin/tools/staticcheck ./...`.

Before and after each refactor, run focused package tests followed by
`go test ./...` and `go vet ./...`. Run `go test -race` for the affected
concurrent packages on a supported host with a working C toolchain. Leak and
race checks cover different problems, and both depend on the paths the tests
actually exercise. These local commands do not modify the manual CI triggers.

## Frontend formatting

The `web` frontend uses a pinned Prettier development dependency. Run these
commands from `web` after `npm ci`:

```powershell
npm.cmd run format
npm.cmd run format:check
```

`format` writes consistent formatting to source, styles, tests, scripts, and
configuration. `format:check` reports differences without changing files.
Dependencies, generated reports, coverage, build output, and `package-lock.json`
are excluded. Formatting options live in `web/.prettierrc.json`; line endings
are normalized to LF for consistency across platforms.

## Build release archives

```powershell
go run ./cmd/release --version 0.3.1 --out dist/0.3.1
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
collection. See [chat and storage](chat-and-storage.md) for usage, limits,
and validation. Desktop chat/backup controls require the native application;
CLI archives include the browser dashboard and CLI garbage collection. Check
each release's notes and assets for its available features and binaries.

Additional agents, unattended continuation loops, and cloud sync remain deferred.


## Validation scripts

See [frontend architecture](frontend-architecture.md) for the atomic component
layers, handler boundaries, 200-line limit, and frontend validation commands.

Run `node scripts/check-docs.mjs` for relative Markdown links and outdated repository references. `go run ./cmd/release --verify-only --version VERSION --out DIRECTORY` verifies archive checksums, contents, and Unix executable modes.

On Windows amd64, add `--desktop-windows` when packaging. It creates a separate portable preview ZIP with `AgentTM.exe` and `agenttm-cli.exe`. Its GUI build uses the production Wails tag and Windows GUI subsystem. See [desktop onboarding](desktop-onboarding.md).

```powershell
go run ./cmd/release --version 0.3.1 --targets windows/amd64 --desktop-windows --out dist/desktop-0.3.1
go run ./cmd/release --verify-only --version 0.3.1 --out dist/desktop-0.3.1
./scripts/test-install.ps1 -AssetDir dist/desktop-0.3.1 -Version 0.3.1
./scripts/test-desktop.ps1 -Archive dist/desktop-0.3.1/agenttm-desktop_0.3.1_windows_amd64.zip -Version 0.3.1
```

Use a fresh output directory for each build. Native GUI startup needs WebView2
and a usable Windows desktop session. The packager does not sign binaries or
publish anything. A portable desktop ZIP is not an installed project picker.

The manually dispatched release workflow calls native Windows/Linux/macOS
validation before publishing to this same public repository using its GitHub
token. No separate repository, private-source gate, or cross-repository token is
required. New application archives include LICENSE, NOTICE, and dependency
notices. GitHub-generated source archives still expose this public source tree.
No release is published by local build commands.
