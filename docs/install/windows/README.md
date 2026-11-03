# Install AgentTM on Windows

[Main README](../../../README.md) · [macOS](../macos/README.md) · [Linux](../linux/README.md)

## 1. Choose desktop or CLI

| You want | Download | Continue with |
| --- | --- | --- |
| A native Windows window with Codex chat | `agenttm-desktop_VERSION_windows_amd64.zip` | [Desktop portable app](#3a-desktop-portable-app) |
| A terminal command and browser dashboard | `agenttm_VERSION_windows_amd64.zip` or `agenttm_VERSION_windows_arm64.zip` | [CLI and browser dashboard](#3b-cli-and-browser-dashboard) |

`VERSION` means the version in the release's actual filename. Do not type VERSION
literally. The native desktop ZIP is a separate download and is available only
when listed in that release's Assets. Native ARM64 desktop packaging is not provided.

Git 2.42+ is required for project operations. New recordings need an installed,
authenticated [Codex CLI](https://developers.openai.com/codex/cli). Go and Node.js
are not needed to run AgentTM's prebuilt binaries. The native desktop app also
requires [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).

## 2. Download and verify

1. Create a new empty download folder, such as `Downloads\AgentTM-downloads`.
2. Open [Latest release → Assets](https://github.com/Jyotishmoy12/AgentTM/releases/latest).
3. Save **one** ZIP matching your choice above into that folder.
4. Save **SHA256SUMS** from that same release into the same folder. It is a
   separate download, not a file you should expect inside the ZIP.
5. For the **CLI option only**, also save **install.ps1** from that release there.
   The desktop option does not use this installer.

The filename must be `SHA256SUMS`, not `SHA256SUMS.txt`. Do not mix downloads from
different releases. GitHub's **Source code** downloads are not prebuilt apps.

Open the download folder in File Explorer. Click its address bar, type
`powershell`, and press Enter. Use this same PowerShell window for the following
steps so saved variables remain available. Confirm the files are present:

```powershell
Get-ChildItem -File | Select-Object Name
```

You should see the ZIP and SHA256SUMS; CLI users should also see install.ps1.
If you opened an already extracted folder, go back to the folder containing the
ZIP before verifying it.

```powershell
$archives = @(Get-ChildItem -File -Filter 'agenttm*.zip')
if ($archives.Count -ne 1) { throw 'Keep exactly one AgentTM ZIP in this download folder.' }
$archive = $archives[0]
Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256
Get-Content -LiteralPath .\SHA256SUMS | Select-String -SimpleMatch $archive.Name
```

Compare the two 64-character hashes. They must match, ignoring letter case, and
the manifest line must name this exact ZIP. If the file or entry is missing, or
the hashes differ, stop and re-download both files from the same release.

## 3A. Desktop portable app

**Use only for `agenttm-desktop_...zip`. Skip the CLI installer section.**
The ZIP contains AgentTM.exe, agenttm-cli.exe, documentation, and notices. It
does not contain install.ps1 or another CLI ZIP. Extraction does not add a global
`agenttm` command to PATH.

After successful checksum verification, extract it in your current PowerShell window:

```powershell
Expand-Archive -LiteralPath $archive.FullName -DestinationPath .\desktop
$appDir = (Resolve-Path -LiteralPath .\desktop).Path
Get-ChildItem -LiteralPath $appDir -File | Select-Object Name
```

Confirm AgentTM.exe and agenttm-cli.exe are listed. Use a fresh destination if
`desktop` already exists; close the app before replacing an older extraction.
If you already extracted the verified ZIP, open PowerShell in that extracted
folder, run `$appDir = (Get-Location).Path`, and continue below.

For a first test, create a fresh demo Git project and open it:

```powershell
$demo = Join-Path $env:TEMP ('agenttm-demo-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $demo | Out-Null
Set-Location $demo
git init
& (Join-Path $appDir 'agenttm-cli.exe') init
& (Join-Path $appDir 'AgentTM.exe')
```

The native window should open. Follow **Setup guide**, then use **Chat with
Codex** for your first recorded task. Begin with Read only; choose Allow project
edits when you intend file changes. Open Sessions afterward to inspect the run.

To use an existing project instead of the demo, change to its actual Git working
tree, then initialize and launch using the same saved app directory:

```powershell
Set-Location 'C:\path\to\your\git-project'
& (Join-Path $appDir 'agenttm-cli.exe') init
& (Join-Path $appDir 'AgentTM.exe')
```

Replace that example project path. The working directory selects the project;
there is no project picker before startup. On later launches, set `$appDir` to
the extracted app folder again if using a new terminal. The preview is unsigned;
Windows reputation warnings may appear. A checksum is not publisher signing.

Continue with the [user guide](../../user-guide.md#8-use-native-desktop-chat).

## 3B. CLI and browser dashboard

**Use only for `agenttm_VERSION_windows_...zip`. Skip this section for a desktop ZIP.**
Stay in the original download folder. Keep the verified CLI ZIP **unextracted**
beside install.ps1 and SHA256SUMS. The `$archive` variable is from step 2.

```powershell
Unblock-File -LiteralPath .\install.ps1
.\install.ps1 -Archive $archive.FullName -ChecksumFile .\SHA256SUMS -AddToPath
agenttm version
```

The installer rechecks the checksum and installs to `%LOCALAPPDATA%\AgentTM\bin`.
`agenttm version` should report the version you downloaded. New terminals in
other apps pick up the updated user PATH; already-open terminals may not.

Open a Git project in this terminal, replacing the example path:

```powershell
Set-Location 'C:\path\to\your\git-project'
agenttm init
agenttm codex doctor
agenttm run codex -- "Explain this project"
agenttm ui
```

For a new empty project, run `git init` first. The browser dashboard normally
opens at `http://127.0.0.1:7331`. Keep the terminal running; Ctrl+C stops it.
This CLI path opens a browser, not the native desktop app.

## Troubleshooting and upgrades

| Problem | Next step |
| --- | --- |
| install.ps1 missing | Desktop users do not need it. CLI users must download it separately, then open PowerShell in the download folder. |
| SHA256SUMS missing | Download it from the same release and put it beside the ZIP, not inside the extraction. |
| No ZIP matches | You may be in an extracted folder. Return to the folder containing the ZIP. |
| Script blocked | Unblock-File may resolve a downloaded-file block; organization/AllSigned policies can still require signed scripts. Use [verified manual extraction](../../installation.md#windows-cli-installation) if permitted. |
| agenttm command missing | Reopen the terminal or invoke the installed executable with `&` and its full path. Desktop's helper is named agenttm-cli.exe. |
| Codex not found | Check `codex --version` and PATH; native Model settings can choose the executable directly. |
| Port 7331 busy | Use `agenttm ui --port 7332` or `--port 0`. |

For an explicit CLI upgrade, close AgentTM and rerun the installer with `-Force`.
It otherwise refuses to overwrite an existing installation. Project history
stays under each project's `.agenttm` directory; do not delete it to upgrade.

[User guide](../../user-guide.md) · [More troubleshooting](../../installation.md) · [Main README](../../../README.md)
