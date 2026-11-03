# v0.3.3 release validation and desktop onboarding follow-up

Validated on 2026-11-03. This report separates the **published v0.3.3 assets**
from **unpublished source changes**. It does not replace the historical
[launch audit](launch-audit.md).

## Published release

[v0.3.3](https://github.com/Jyotishmoy12/AgentTM/releases/tag/v0.3.3)
was built from commit `b1d0bd50ef4b22bb3432f3aae2a20a252a37d346`.
Its assets include six platform CLI archives, a separate Windows amd64 desktop
ZIP, installers, and SHA256SUMS. No assets were replaced or published in this pass.

The actual Windows assets were downloaded from that release, not rebuilt for
these tests:

| Download | SHA-256 verification |
| --- | --- |
| agenttm_0.3.3_windows_amd64.zip | PASS: `a6bdd46adfb885e032048943e5a77e5f587df45533e0a7627d85a432998af2c9` |
| agenttm-desktop_0.3.3_windows_amd64.zip | PASS: `e7d808ea91177b08f198c48b8855328f0e2f6ee8531d46932da6fbdf1f261830` |

Both hashes matched the downloaded release SHA256SUMS. The installer tested was
the release's downloaded install.ps1. CLI extraction produced agenttm.exe;
desktop extraction included AgentTM.exe, agenttm-cli.exe, documentation, and
license notices. The desktop executable uses the Windows GUI subsystem.

## Windows results on the existing development host

These were isolated temporary directories and a temporary installation profile,
**not a clean Windows VM**. Git, WebView2 and authenticated Codex were already
installed on the host. The installer test removed Go, Node and Codex from its
runtime PATH; its temporary user PATH changes were restored afterward.

Commands below ran from the repository. `$assets` denotes the downloaded asset
directory, `.test-work/review-033`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-install.ps1 -AssetDir $assets -Version 0.3.3 -Installer "$assets/install.ps1" -TestUserPath
node scripts/smoke-ui.mjs "$assets/cli/agenttm.exe" 0.3.3
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-desktop.ps1 -Archive "$assets/agenttm-desktop_0.3.3_windows_amd64.zip" -Version 0.3.3
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-recording.ps1 -Binary "$assets/cli/agenttm.exe" -Model gpt-6.1-sol -RealCodex
```

All four commands passed:

- Default per-user installation, current/user PATH, version output, overwrite
  refusal, explicit upgrade, locked-file preservation, and bad-checksum rejection.
  The upgrade fixture simulates an old executable; it is not an actual previous
  release migration test. `doctor` passed storage integrity and correctly reported
  missing Codex with the isolated PATH.
- Packaged browser dashboard: loopback binding, version, and two embedded
  production JS/CSS assets served successfully.
- Published desktop: extraction, helper version, native window startup from an
  initialized disposable Git project. This is a startup smoke, not a complete
  desktop chat or native dialog automation test.
- Real Codex CLI `0.164.0-alpha.11.1`: detection and authentication, recording,
  baseline and operation completion checkpoints, historical file contents,
  checkpoint differences, isolated baseline restoration, unchanged original
  files/index/HEAD, and final storage integrity.

Real session: `0d9322a5-e348-43b0-8f79-ceb450b04cfb`; two operations, five
checkpoints and three content objects. The synthetic `.env` was excluded, making
the snapshots partial; restoration used explicit `--allow-partial`. `doctor`
reported **two operations with incomplete or uncertain coverage**. This is not
evidence of atomic capture, complete boundary coverage, or causal attribution.

## Native platform CI evidence

The existing [v0.3.3 release workflow](https://github.com/Jyotishmoy12/AgentTM/actions/runs/41644379342)
completed successfully. Its inspected job/step metadata showed:

| Platform | Verified workflow results | Local validation limit |
| --- | --- | --- |
| Windows | Native Go tests/vet, frontend tests/build, native packaging, installation and desktop startup smoke passed | Existing host tests above; no fresh VM or SmartScreen validation |
| Linux | Native Go tests/vet, frontend tests/build, browser tests, native archive installation and UI smoke passed | Published Linux archives were not downloaded or executed locally in this pass |
| macOS | Native Go tests/vet, frontend tests/build, native archive installation and UI smoke passed | Published macOS archives were not downloaded or executed locally; Gatekeeper experience untested |

The native CI tests install archives built from the release commit before
publication. They are not independent installations of downloaded published
assets. Success on each runner does not validate every architecture; ARM64
Windows/Linux and Intel/Apple-silicon combinations beyond the actual runner
remain untested here. GitHub-hosted runners also have development dependencies.

## Source changes after v0.3.3

- Native welcome screen with **Open a Git project**, folder selection and explicit
  initialization confirmation; cancellation and errors permit retry. Existing
  history/configuration is preserved. Already initialized working-directory
  launches continue opening directly. Switching projects requires reopening.
- Picker routing, project initialization safety and welcome JavaScript tests.
  CI now checks native window startup outside a Git project as well as from an
  initialized project. The smoke verifies window creation, not dialog contents.
- README's full comparison moved to [comparison-with-git.md](comparison-with-git.md).
  Windows installation, desktop onboarding and the user guide distinguish the
  new source flow from the published v0.3.3 terminal-based launch.

Local source validation:

```powershell
# Writable build/test directories for this restricted workspace:
$env:GOCACHE = 'C:\dev\AgentTM\.test-work\go-cache'
$env:TEMP = 'C:\dev\AgentTM\.test-work\tmp'
$env:TMP = $env:TEMP
go test ./...
go vet ./...
node scripts/check-docs.mjs
# From web/:
npm.cmd test
# From the repository root:
go run ./cmd/release --version 0.3.4 --targets windows/amd64 --desktop-windows --out .test-work/review-033/source-final
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-desktop.ps1 -Archive .test-work/review-033/source-final/agenttm-desktop_0.3.4_windows_amd64.zip -Version 0.3.4 -ExpectWelcome
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-desktop.ps1 -Archive .test-work/review-033/source-final/agenttm-desktop_0.3.4_windows_amd64.zip -Version 0.3.4
```

Go tests/vet, documentation checks, ten JavaScript tests, package builds,
archive content/checksum verification and both native startup smokes passed.
The first broad Go test attempt used the restricted host TEMP and failed with
access-denied errors; repeating with the writable test TEMP above passed.
An optional attempt to inspect the welcome DOM through a temporary WebView2
debugging connection could not obtain an endpoint; it is not counted as a pass.
`0.3.4` is a **local validation label**, not a published release or a version
promise. No product history was deleted and no release was dispatched.

## Remaining launch checks and assessment

**READY WITH LIMITATIONS for an early public beta.** Published v0.3.3's tested
Windows recording/restoration path works, with the documented uncertainty above.
The new picker still needs a release built from these changes and a manual
end-to-end folder-selection/confirmation check. A clean Windows VM test, Windows
reputation-warning checks, macOS Gatekeeper validation, and a real demonstration
video remain outstanding. Existing desktop chat continuation tests do not become
a fresh published-v0.3.3 desktop chat test merely because startup passes.

AgentTM remains **public source and proprietary**, not open source. The existing
[licensing explanation](licensing.md) describes binary-use permissions and notes
that legal review is still needed; this audit does not constitute legal review.
Future release publication requires the maintainer's explicit approval.
