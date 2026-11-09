# AgentTM v0.4.1 release validation

Test date: 9 November 2026. Published release and source commit:
`f0fa07013bb9e5c9e93ec789227d6f8881b287d4`.

Assessment: suitable for early evaluation with the limitations below. This is
not a guarantee of lossless capture, clean-machine compatibility, or exact
per-operation before/after states.

## Scope and isolation

- Downloaded the actual [v0.4.1 release](https://github.com/Jyotishmoy12/AgentTM/releases/tag/v0.4.1).
- Verified all ten assets against GitHub's SHA-256 asset digests.
- Verified all seven archives against the published `SHA256SUMS`, expected
  archive contents, platform names, and Unix executable modes.
- Ran local tests on Windows x64. Restricted child-process PATH and temporary
  LOCALAPPDATA simulated missing development tools and a fresh installation.
- Did not uninstall Git, Codex, Go, or Node; change the user's persistent PATH;
  replace the installed app; or modify existing user history.
- Native startup tests launched and stopped only temporary copies of the app.
- Test repositories and encrypted archives are disposable. The application
  still depends on the host's Windows components and installed WebView2.

## Local results

| Check | Result and evidence |
| --- | --- |
| `go test ./...` | Passed across all project packages, including configured goleak checks |
| `go vet ./...` | Passed after frontend assets finished building |
| Dashboard lint, formatting, architecture | Passed; 310 files checked against the 200-line limit |
| Dashboard `npm test` | 17 tests passed |
| Dashboard production build | Passed; Monaco emitted a nonfatal chunk-size warning |
| Downloaded dashboard browser tests | 57 tests passed in Chrome against the v0.4.1 executable |
| Script contract and documentation tests | 15 tests passed; links checked across 33 Markdown files before adding this report |
| Windows installer safety tests | Passed, including standalone script and malformed archive cases |
| Downloaded Windows CLI installer | Passed fresh install, version, overwrite refusal, explicit upgrade, locked executable, and checksum rejection |
| Missing Codex | Restricted PATH produced the expected unavailable diagnostic; SQLite integrity still passed |
| Missing Git | Initialization failed without creating history; wording needs improvement, below |
| Packaged browser dashboard | Correct version, embedded JS/CSS, and loopback binding passed |
| Downloaded native desktop | GUI executable and bundled CLI verified; project and welcome windows appeared |

Browser tests include smaller desktop layouts, navigation, history inspection,
partial captures, failure displays, approvals, and backup/cleanup form behavior.
Some native actions and Codex responses are simulated by test fixtures. These
tests do not establish that every native dialog or live conversation works.

## Real Codex recording and recovery

Used the published Windows CLI with the installed Codex extension executable
and its companion execution host. Codex version: `0.164.0-alpha.11.1`;
requested model: `gpt-6.1-sol`. Existing authentication was used without printing
or changing credentials. No sandbox or approval policy was bypassed.

Session: `94cfcd09-3ad9-4566-828a-f53975de0d90`.

1. Created a disposable Git repository and committed one baseline file.
2. Added a synthetic `.env` file to exercise snapshot exclusions.
3. Recorded a real Codex task modifying `note.txt` and creating `audit.txt`.
4. Recorded two operations and five checkpoints.
5. Verified baseline and final historical file contents and checkpoint diffs.
6. Verified `.env` was omitted and captures were labeled partial.
7. Restored the baseline into a separate Git worktree with explicit partial consent.
8. Verified original file hashes, Git index hash, and HEAD were unchanged.
9. Ran `doctor`: database and snapshot integrity passed; coverage warnings remained.

## Backup, restore, and cleanup

A temporary Go integration harness exercised the source backend at the release
commit using the real recorded history above. This was not a native dialog test.

- Created an encrypted backup with a generated passphrase, never logged or retained.
- Rejected incorrect passphrase, nonexistent archive, and authenticated-data tampering.
- Verified failed restores did not publish `.agenttm` history.
- Restored into a new disposable Git repository.
- Rejected restoring again over its existing history.
- Compared every captured file's historical bytes across all five checkpoints.
- Verified both operation records and session identity survived.
- Restored history passed integrity verification with the original coverage warnings.
- Cleanup preview reported three objects, three references, and zero eligible blobs.
- Shared-object retention, deletion, stale-preview rejection, corrupt/unindexed
  manifest protection, and lock behavior are covered by the passing backend suite;
  the real-history check performed preview only.

## Native Linux and macOS evidence

Inspected successful [CI run 42611480855](https://github.com/Jyotishmoy12/AgentTM/actions/runs/42611480855)
for the exact release commit, and successful
[release run 42612159658](https://github.com/Jyotishmoy12/AgentTM/actions/runs/42612159658).

| Platform | Verified evidence |
| --- | --- |
| Windows | Local downloaded release tests above; native CI tests, packaging, installer, and desktop smoke checks passed |
| Linux | Native CI tests, vet, storage/fork/server race checks, browser tests, packaging, installer, and embedded-dashboard smoke passed |
| macOS | Native CI tests, vet, packaging, installer, and embedded-dashboard smoke passed |

Unix installer checks exercise checksums, extraction, executable permission,
version, overwrite refusal, tampered archives, and project initialization.
They execute archives built on the native runner, not the separately downloaded
published Unix archives. All published Unix archives were inspected locally but
not executed on this Windows machine. CI evidence is not a manual desktop test
or proof of execution on every published CPU architecture.

## Findings and remaining limits

1. **Operation timing is best-effort.** Both real CLI operations retained before
   and after checkpoint links, but their before observations already contained
   the file edits. Their per-operation changed-path lists were empty. One before
   observation was marked potentially inconsistent. Baseline-to-final recovery
   worked; this does not prove pre-execution capture or causal attribution.
2. **Partial coverage is expected here.** The excluded synthetic `.env` produced
   partial captures and the two-operation coverage warning. `doctor` reported no
   integrity problems. Do not silently interpret this warning as lost history or
   advertise complete workspace capture.
3. **Missing-Git wording is misleading.** The published CLI safely refused init
   with Git absent from PATH, but said to run `git init` rather than explicitly
   asking the user to install Git. No product change was made in this audit.
4. **Windows audit harness fixed.** Ordinary native stderr output was treated as
   fatal by PowerShell during log redirection. The harness now handles native
   command exit status explicitly and avoids the Git line-ending warning while
   staging its disposable baseline. Script safety and contract checks passed.
5. A real native backup file-picker interaction, real interactive continuation,
   and real approval/cancellation dialogs were not automated end to end here.
   Their backend and fixture tests passed; those are distinct evidence levels.
6. No fresh Windows VM, missing-WebView2 installation, SmartScreen/reputation,
   antivirus compatibility, overnight soak, or every OS/CPU combination was tested.
7. Live network interruption and forced termination of the real model run were
   not exercised; controlled cancellation/crash tests passed in the backend suite.

## Reproduction and local evidence

Downloaded assets, logs, the one-off backup harness, and its JSON report remain
under `.test-work/release-validation-2026-11-09/` (ignored by Git).
The real task used a new `agenttm-recording-audit-*` temporary repository.

Primary commands, run from the repository root unless stated otherwise:

```powershell
go test ./...
go vet ./...
go run ./cmd/release --verify-only --require-all-targets --version 0.4.1 --out .test-work/release-validation-2026-11-09/assets
./scripts/test-scripts.ps1
./scripts/test-install.ps1 -AssetDir .test-work/release-validation-2026-11-09/assets -Version 0.4.1 -Installer .test-work/release-validation-2026-11-09/assets/install.ps1
./scripts/test-desktop.ps1 -Archive .test-work/release-validation-2026-11-09/assets/agenttm-desktop_0.4.1_windows_amd64.zip -Version 0.4.1
./scripts/test-desktop.ps1 -Archive .test-work/release-validation-2026-11-09/assets/agenttm-desktop_0.4.1_windows_amd64.zip -Version 0.4.1 -ExpectWelcome
node scripts/smoke-ui.mjs .test-work/release-validation-2026-11-09/cli/agenttm.exe 0.4.1
./scripts/audit-recording.ps1 -Binary .test-work/release-validation-2026-11-09/cli/agenttm.exe -Model gpt-6.1-sol -RealCodex
```

The recording audit requires the actual Codex distribution directory on the
child process PATH, including its companion executables. It makes a real model
request. The backup harness is `history-roundtrip.go` in the evidence directory.

From `web`, ran `npm run lint`, `npm run format:check`,
`npm run check:architecture`, `npm test`, and `npm run build`.
For `npm run test:e2e`, set `AGENTTM_E2E_BINARY` to the downloaded CLI's absolute
path and `AGENTTM_E2E_PORT=7348`; it seeded fresh synthetic history automatically.

No release was published, no installed executable was replaced, and no product
features were added by this validation pass.
