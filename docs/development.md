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
