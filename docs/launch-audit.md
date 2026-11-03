# Pre-launch audit — 2026-11-03

This audit separates published v0.3.0, locally built preview packages, and native
platform tests. It does not publish releases or change product behavior.

## Published release

Verified [v0.3.0](https://github.com/Jyotishmoy12/AgentTM/releases/tag/v0.3.0)
through GitHub's release API and downloaded every asset. All six CLI archives
match SHA256SUMS and GitHub's asset digests. Each contains exactly README.md,
RESTORE.md, THIRD_PARTY_NOTICES.txt, and one CLI binary. Unix binaries have archive
mode 0755. There is no native desktop executable in this release.

All nine assets, including both installers and SHA256SUMS, also match the digests
returned by GitHub's release API. Windows amd64 reports
`agenttm 0.3.0 (11ba6db)`, built with Go 1.25.0.
The extracted executable successfully served its embedded production React JS/CSS
and versioned health API on loopback. No Go/Node installation is needed at runtime.

## Installation verification

The downloaded Windows installer was run in a child process with Go, Node, and
Codex omitted from PATH. Installation into a fresh directory, `version`, refusal
to overwrite, explicit replacement of an older placeholder, checksum rejection,
and initialization passed. `doctor` passed SQLite/snapshot checks and correctly
returned nonzero for intentionally missing Codex.

`-AddToPath` was tested against the real process and user PATH; the original user
PATH was restored in a finally block. This is an isolated-path test on an existing
Windows host, **not a clean Windows VM**. Git and the OS remain installed.

Linux/macOS checks cover checksums, archive entries, Unix executable mode metadata,
and shell syntax. All four Unix archives were extracted through the installer
under Git Bash on Windows; extracted binary bytes matched the archive entry,
checksum tampering was rejected, and existing installations were preserved.
This does not validate native Unix permissions or execution. Their executables
and installer runtime are **not natively tested on this Windows host**. Windows
ARM64 execution is also untested.

## Real recording and restoration

Downloaded v0.3.0 ran a real task using installed Codex
`0.164.0-alpha.11.1`, model `gpt-6.1-sol`, and explicit workspace-write permissions
in a new temporary Git repository. Session `fdd23215-581a-46cf-929a-f61a495167a6`
recorded two operations, five checkpoints, and three content objects.

Verified baseline and edited historical file contents, checkpoint parent diffs,
`.env` exclusion, baseline worktree restoration, and unchanged original file
hashes, Git index hash, and HEAD. `doctor` passed integrity verification and
reported two operations with partial/uncertain coverage. The intentionally
excluded `.env` made snapshots partial. Partial restoration required explicit
consent. These warnings are expected coverage limits, not hidden successes.

The current source App Server integration also passed the opt-in real two-turn
conversation-resume test using the same installed Codex/model. Session
`40a633ac-cde9-4aab-b9bd-2233fd2965a6` retained the requested token across a
continued turn. This verifies the real protocol path behind desktop continuation;
it is not checkpoint-based conversation rewinding or a full GUI chat acceptance test.

An initial real attempt with a redirected TEMP failed in Codex's sandbox helper;
the normal Windows TEMP retry succeeded. No sandbox or approval bypass was used.
The first validation script incorrectly expected the final no-op checkpoint to
have a diff; it was corrected to inspect all boundary checkpoints. That correction
reused the successful recording and did not make another model request.

## Local preview packaging

Native Windows amd64 ZIP packaging is implemented and archive/checksum verified
locally with version `0.3.1-audit`. It bundles AgentTM.exe, agenttm-cli.exe, standalone
startup instructions, restore guidance, and dependency notices. All six CLI
platforms and the separate desktop ZIP cross-built and passed checksums, exact
entry checks, and executable-mode verification.

The extracted desktop ZIP's helper reported the expected version. The desktop PE
header specifies the Windows GUI subsystem, and a hidden native AgentTM window
was created successfully from an initialized disposable repository using installed
WebView2. The test closed only its owned process. This is a startup smoke test,
not a full manual desktop interaction or a clean-machine WebView2 installation.
No desktop asset has been uploaded to v0.3.0.

The current Windows installer now stages extraction before replacing an older
binary. Tests passed for default installation under a temporary LOCALAPPDATA,
paths with spaces, PATH updates, upgrade refusal, explicit replacement, preservation
of a locked executable, and checksum rejection. PowerShell 5's null-string
conversion was caught in the test and corrected for the replacement API.

## Changes made

| File | Reason |
| --- | --- |
| `README.md` | Correct public links, actual v0.3.0 downloads, concise onboarding, feature/distribution distinctions, architecture, privacy limits, roadmap, and licensing status. |
| `docs/cli.md` | Move the long command reference and disposable-repository examples out of the main README. |
| `docs/development.md` | Move build instructions and document native packaging and release verification. |
| `docs/installation.md` | Explain checksum failures, PATH, permissions, authentication/model errors, ports, upgrades, and platform gaps. |
| `docs/launch-audit.md` | Record evidence, exact commands, limitations, and the readiness assessment. |
| `docs/chat-and-storage.md` | Distinguish published CLI GC from desktop-only chat, continuation, and encrypted backup controls. |
| `docs/desktop-onboarding.md` | Document portable ZIP startup, bundled CLI helper, unsigned preview status, working-directory requirements, and WebView2. |
| `docs/snapshots.md` | Correct the outdated statement that blob cleanup is deferred; cleanup is explicit. |
| `docs/ui.md` | Match navigation and Operations documentation to the implementation. |
| `docs/release-checklist.md` | Clearly label old v0.1 evidence as historical and point to this audit. |
| `cmd/release/main.go` | Add Windows desktop packaging and verification modes, and verify newly created packages. |
| `cmd/release/instructions.go` | Ship standalone archive instructions with correct public URLs rather than a README whose relative links are broken outside the source tree. |
| `cmd/release/verify.go` | Verify checksums, exact entries, sizes/types, Unix modes, duplicate/unlisted assets, and required platform files. |
| `cmd/release/main_test.go` | Cover corruption, wrong versions, missing platform archives, and unlisted assets. |
| `scripts/install.ps1` | Stage extraction and atomically replace an existing executable on explicit upgrade. |
| `scripts/test-install.ps1` | Test default destination, isolated runtime PATH, version, upgrade cases, locks, tampering, and missing-Codex diagnostics. Restore user PATH after testing. |
| `scripts/test-install.sh` | Native Unix installer smoke checks and an explicit extraction-only mode for this Windows host. |
| `scripts/test-desktop.ps1` | Verify the extracted native package, bundled helper version, GUI subsystem, and native-window startup. |
| `scripts/smoke-ui.mjs` | Verify a packaged binary serves its production embedded assets and expected health version on loopback. |
| `scripts/check-docs.mjs` | Check relative Markdown files/images/headings and outdated repository references. |
| `scripts/audit-recording.ps1` | Reproduce the opt-in real recording/restoration audit using only newly created disposable repositories. |
| `.github/workflows/ci.yml` | Add documentation and archive checks, native installer/version/UI checks, desktop packaging/startup, and reusable validation. |
| `.github/workflows/release.yml` | Gate manual publication on native validation, include the desktop ZIP, and verify the complete six-platform-plus-desktop set before publication. |

The local Git origin was corrected to `https://github.com/Jyotishmoy12/AgentTM.git`.
No product capture/restore behavior, user history, commits, or remote refs were
changed. No GitHub workflow was dispatched and no release was published.

## Tests executed

Commands were run from the repository root unless stated otherwise. Local Go
commands used a writable temporary GOCACHE; Windows tests used generated temporary
repositories. Real model requests used the normal Windows TEMP after the initial
helper failure. Versions with `-audit` are local test builds, not public releases.

| Command | Result |
| --- | --- |
| Download all nine assets from `/releases/download/v0.3.0/` with `curl.exe -fsSL --retry 2` | Passed; all asset digests match GitHub API metadata. |
| `go test ./...` | Passed on Windows; includes synthetic failure, cancellation, persistence interruption, exclusions, restore preservation, backup authentication/tamper, and GC safeguards. |
| `go vet ./...` | Passed. |
| `go test -race ./internal/capture ./internal/interactive ./internal/maintenance ./internal/storage ./internal/fork ./internal/server` | Passed. |
| `npm.cmd test` in `web` | Eight tests passed. |
| `npm.cmd run build` in `web` | TypeScript and production build passed; existing Monaco chunk-size warning remains. |
| `npm.cmd run test:e2e` in `web` | All 13 browser tests passed. Desktop bridge actions in browser tests use explicit mocks; they are not real model requests. |
| `node scripts/check-docs.mjs` | Passed, including internal heading/image references. |
| `git grep -n ('AgentTM' + '-demo')` in PowerShell | No tracked source matches; the checker also covers new Markdown files. Historical downloaded archives are not rewritten. |
| `git diff --check` | Passed. |
| `go run ./cmd/release --verify-only --version 0.3.0 --out .test-work/launch-audit/published` | All six published archives passed. |
| `go run ./cmd/release --version 0.3.1-audit --desktop-windows --out .test-work/launch-audit/generated-all` | All six CLI targets and Windows desktop ZIP built and verified. |
| `go run ./cmd/release --verify-only --require-all-targets --desktop-windows --version 0.3.1-audit --out .test-work/launch-audit/generated-all` | Complete seven-archive set passed. |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-install.ps1 -AssetDir .test-work/launch-audit/published -Version 0.3.0 -Installer .test-work/launch-audit/published/install.ps1 -TestUserPath` | Published installer passed, including default destination in a temporary profile and restored user PATH. |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-install.ps1 -AssetDir .test-work/launch-audit/generated-all -Version 0.3.1-audit -TestUserPath` | Updated staged installer passed. |
| `sh -n scripts/install.sh` and `sh -n scripts/test-install.sh` | Passed under Git Bash. |
| `sh scripts/test-install.sh .test-work/launch-audit/published 0.3.0 PLATFORM --extract-only` for `linux_amd64`, `linux_arm64`, `darwin_amd64`, `darwin_arm64` | Extraction, byte comparison, checksum rejection, and overwrite refusal passed. Native execution/permissions remain untested. |
| `node scripts/smoke-ui.mjs .test-work/launch-audit/published-extracted/agenttm.exe 0.3.0` | Published embedded dashboard and health version passed. |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-desktop.ps1 -Archive .test-work/launch-audit/generated-all/agenttm-desktop_0.3.1-audit_windows_amd64.zip -Version 0.3.1-audit` | Native package startup passed on this WebView2-equipped Windows host. |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/audit-recording.ps1 -Binary .test-work/launch-audit/published-extracted/agenttm.exe -Model gpt-6.1-sol -RealCodex` | Real run succeeded with normal Windows TEMP; final inspection was resumed using `-InspectExistingAudit` after correcting the test's no-op-diff assumption. |
| `$env:AGENTTM_REAL_CODEX='1'; $env:AGENTTM_REAL_MODEL='gpt-6.1-sol'; go test ./internal/interactive -run '^TestRealCodexConversationResume$' -v -count=1` | Passed a real two-turn recorded Codex conversation and resume in a disposable repository. |
| Both workflow YAML files parsed with an already-cached YAML parser; manual hooks and `package.needs: validate` checked | Passed locally. GitHub's expression evaluation and hosted execution have not been exercised. No repository dependency was added. |

PowerShell execution policy was changed only for the child test processes in the
commands above, not machine/user policy. Codex sandbox and approval policies
were not bypassed. Published real Ctrl+C cancellation was not rerun; cancellation
and interrupted persistence passed synthetic source tests.

## Platform compatibility

| Platform | Verified here | Still untested |
| --- | --- | --- |
| Windows amd64 | Published install/version/init/doctor/UI, default/PATH/upgrade/tamper checks, real recording/restore, local native desktop startup with WebView2. | Clean Windows VM; WebView2 installation from absent runtime; full manual desktop acceptance and SmartScreen reputation. |
| Windows arm64 | Published and generated archive hashes/entries; successful cross-build. | Native execution and installation. |
| Linux amd64/arm64 | Archive hashes/entries/0755 metadata; cross-builds; installer extraction and rejection checks through Git Bash. | Native installer execution, runtime permission semantics, binaries, and browser behavior. |
| macOS amd64/arm64 | Archive hashes/entries/0755 metadata; cross-builds; installer extraction and rejection checks through Git Bash. | Native installer execution, binaries, permissions, Gatekeeper behavior, and browser behavior. |

Native Windows/Linux/macOS CI gates are configured, not claimed as hosted passes.

## Remaining issues

1. The owner must choose a project license. There is no project-level LICENSE
   file; dependency notices do not supply one. Do not advertise an open-source
   license that has not been selected.
2. Push/review these changes and run manual CI on native hosted platforms before
   publishing. The new reusable workflow and GUI runner capability need hosted
   validation. Nothing was dispatched or published during this audit.
3. Existing v0.3.0 archives retain their historical README, including old repository
   links. Corrected standalone instructions and the native desktop ZIP will reach
   downloaders only through an approved follow-up release; public assets were not
   silently replaced.
4. The native preview is unsigned, portable, and requires WebView2 plus launch
   from an initialized Git working directory. It is not a double-click installer
   with project selection. Do not market it as one.
5. Checkpoints are scan-time observations. The real audit demonstrated changes
   can appear at start-time observations and that a final/no-op checkpoint can
   have an empty parent diff. Partial/uncertain coverage is reported, not repaired
   by claiming atomic boundaries or causal provenance.
6. A truly clean VM and native Linux/macOS/ARM runtime tests remain outstanding.
   The initial Codex helper failure with redirected TEMP also merits a normal
   user-machine smoke test using the supported Codex installation.
7. Existing Monaco bundle-size warnings remain; no product performance changes
   were introduced during this documentation/packaging audit.

## Product Hunt readiness

**READY WITH LIMITATIONS for an explicitly scoped CLI evaluation launch.** The
published Windows amd64 core recording/inspection/restoration workflow and local
installation checks passed. Downloads and feature availability are documented
accurately; source-only desktop controls are separated from published assets.

This is not a readiness claim for a signed native desktop installer, fully tested
Linux/macOS/ARM distributions, or an open-source licensing announcement. Resolve
the license decision and hosted release gates before making those claims, and
publish any follow-up artifacts only after explicit owner approval.
