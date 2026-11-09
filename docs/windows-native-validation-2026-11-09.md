# Windows native dialog and security follow-up

Date: 9 November 2026. Follows the
[v0.4.1 release validation](release-validation-2026-11-09.md).

## Critical finding and fix

The published v0.4.1 desktop checks native confirmation results against
`Initialize` and `Restore`. Wails v2 on Windows returns `Yes` or `No` for
question dialogs and ignores custom button labels. Consequently, accepting
these dialogs cannot satisfy the old confirmation checks.

See the [Wails dialog contract](https://wails.io/docs/reference/runtime/dialog/).
The pinned v2.11.0 Windows implementation was also inspected locally.

The source fix uses a shared confirmation helper which accepts only `Yes`,
propagates errors, and makes `No` the default. Both initialization and backup
restore use it. Regression tests cover acceptance, refusal, cancellation,
unexpected responses, legacy labels, and errors, including a `Yes` with an error.

An isolated production build was created at
`.test-work/release-validation-2026-11-09/native-fixed/AgentTM.exe`, reporting
version `0.4.1-native-audit`. This is a test build, not a published release.
The installed `bin/desktop/AgentTM.exe` was not replaced.

## Actual native results

These checks used Windows UI Automation and verified owned Win32 controls.
They did not stub the Wails bridge or replace native dialogs with browser mocks.
All destinations were disposable repositories or audit archives.

| Flow | Result |
| --- | --- |
| Existing-project folder picker | Cancellation returned to the same project with explicit feedback |
| Backup passphrase and Save dialog | Cancellation worked; encrypted archive creation succeeded at a verified destination |
| Restore archive picker | Cancellation worked; actual archive selection succeeded |
| Restore destination picker | Cancellation worked; actual clean Git target selection succeeded |
| Restore confirmation, fixed build | Default native button ID was 7 (`No`); declining wrote no history |
| Wrong restore passphrase, fixed build | Native confirmation accepted; inline decryption error shown; target history absent |
| Successful restore, fixed build | Native Yes restored history and displayed success |
| Existing-history restore, fixed build | Rejected; existing database hash unchanged |
| First-run confirmation, fixed build | No default verified; declining did not initialize history |
| First-run project picker, fixed build | Cancellation wrote nothing; selection followed by Yes initialized history and loaded Overview |
| Codex executable picker, fixed build | Cancellation worked without saving a different executable preference |
| Project-open error, fixed build | Error dialog appeared for an invalid disposable Git marker; acknowledgement wrote no history |
| Separate project window, fixed build | Actual picker selection launched another verified owned app process and native window |

Initial filename automation failed to notify the Save dialog's internal control
and used the default Documents destination. The newly created test archive was
moved into the audit folder. Subsequent automation verified the exact disposable
filename before saving successfully. Existing files were not overwritten.

## SmartScreen and signature checks

- The published v0.4.1 `AgentTM.exe` reports Authenticode status `NotSigned`.
- Defender antivirus and real-time protection were enabled. Smart App Control
  reported `Off`; that is a separate setting from SmartScreen.
- Command-line release downloads had no Internet-zone alternate data stream.
  Those earlier launches were not sufficient evidence of downloaded-file screening.
- A separate, byte-identical release executable copy was given Internet-zone
  metadata (`ZoneId=3`) and launched with Windows Shell execution.
- The shell launch completed and the expected app process was verified. The
  Internet mark was still present. Automation did not click Run Anyway, unblock
  the file, create an antivirus exclusion, or change security policy.
- This establishes only that this marked copy launched under this host's current
  policy and reputation/cache state. It does not establish universal absence of
  SmartScreen warnings, a positive reputation, or a clean-machine result.

Microsoft documents the role of signatures and reputation in
[SmartScreen for developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).
Code signing and a separate clean-machine download test remain necessary work
before promising users a warning-free experience.

## Fresh VM and missing WebView2: not executed

The host reports Windows Home (`CoreSingleLanguage`), build 26200 / 25H2.
Virtualization is present, but Windows Sandbox and an installed Windows VM tool
were not found. Microsoft states that
[Windows Sandbox is not supported on Home](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/).

The pinned WebView loader explicitly clears browser-folder, user-data, and
additional-browser-argument environment overrides. A temporary override attempt
therefore did not produce a valid missing-WebView2 environment or test debugger.
This attempt is not counted as a passing runtime-absence test.

WebView2 was not uninstalled, hidden through registry changes, or made inaccessible
on the user's machine. Testing its actual absence still requires an accessible
disposable Windows VM with WebView2 absent. No VM image was downloaded, no OS
license was assumed, and no virtualization/security settings were changed.

## Verification and release implications

Passed after the fix:

```powershell
go test ./cmd/agenttm-desktop ./internal/desktop ./internal/maintenance
go vet ./cmd/agenttm-desktop
go build -tags production -ldflags '-H windowsgui -X agenttm/internal/cli.Version=0.4.1-native-audit' -o .test-work/release-validation-2026-11-09/native-fixed/AgentTM.exe ./cmd/agenttm-desktop
```

The desktop tests include goleak and the 200-line source-file guard.
Native control snapshots and test harnesses remain in the ignored audit folder.
Only test-owned processes were closed; installed tools and existing user history
were preserved. A new release is required to distribute the confirmation fix.

Assessment: native initialization and backup restore were verified on the fixed
test build. Published v0.4.1 should not be described as having these fixes.
Fresh-VM, actual missing-WebView2, and cross-machine SmartScreen behavior remain
open validation items, not successes inferred from source or browser tests.
