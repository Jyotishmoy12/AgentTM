import { useState } from "react";
import { links, platforms } from "./content";
import { Command, GuideLink, Note, Prerequisites, Step } from "./DocsShared";

type OS = "windows" | "macos" | "linux";
function WindowsVerification({ desktop }: { desktop: boolean }) {
  return (
    <>
      <p>
        Open PowerShell{" "}
        <strong>
          inside the folder containing your downloaded ZIP and SHA256SUMS
        </strong>
        : in File Explorer, click the address bar, type <code>powershell</code>,
        then press Enter. Keep this same terminal open through extraction or
        installation.
      </p>
      <p>
        Run each command below separately. Stop if a command reports an error.
      </p>
      <Command
        code="Get-ChildItem -File | Select-Object Name"
        after="You see one matching ZIP and SHA256SUMS. CLI users also need install.ps1."
      />
      <Command
        code={
          desktop
            ? "$archives = @(Get-ChildItem -File -Filter 'agenttm-desktop_*_windows_amd64.zip')"
            : "$archives = @(Get-ChildItem -File -Filter 'agenttm_*_windows_*.zip')"
        }
      />
      <Command
        code="if ($archives.Count -ne 1) { throw 'Keep exactly one matching AgentTM ZIP in this folder.' }"
        after="No output means exactly one matching ZIP was found."
      />
      <Command code="$archive = $archives[0]" />
      <Command
        code="(Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256).Hash"
        after="PowerShell prints a complete 64-character hash."
      />
      <Command
        code="Get-Content -LiteralPath .\SHA256SUMS | Select-String -SimpleMatch $archive.Name"
        after="The manifest prints the expected hash and this exact ZIP filename."
      />
      <Note caution>
        Compare the two complete hashes; letter case does not matter. If they
        differ, the entry is missing, or the filename is wrong, stop. Download
        both files again from the same release. Do not continue to extraction or
        installation.
      </Note>
    </>
  );
}
export function DesktopInstall() {
  return (
    <>
      <Prerequisites desktop />
      <Step number={1} title="Download the desktop files">
        <p>
          Create a new empty download folder. Open{" "}
          <a href={links.releases}>Latest release → Assets</a> and save these
          two files together:
        </p>
        <ul>
          <li>
            <code>agenttm-desktop_VERSION_windows_amd64.zip</code> — the{" "}
            <strong>desktop</strong> archive.
          </li>
          <li>
            <code>SHA256SUMS</code> — a separate download from that same
            release.
          </li>
        </ul>
        <p>
          <code>VERSION</code> describes the version in the actual filename; you
          do not need to type it in the commands below.
        </p>
        <Note>
          Do not choose GitHub's “Source code” ZIP or the CLI-only{" "}
          <code>agenttm_VERSION_windows_amd64.zip</code>. The desktop ZIP has no{" "}
          <code>install.ps1</code> installer.
        </Note>
      </Step>
      <Step number={2} title="Verify the ZIP before opening it">
        <WindowsVerification desktop />
      </Step>
      <Step number={3} title="Extract and check the app files">
        <p>
          After the hashes match, stay in the same PowerShell window. Use a
          fresh destination; if a folder named <code>desktop</code> already
          exists, choose another empty download folder first.
        </p>
        <Command code="Expand-Archive -LiteralPath $archive.FullName -DestinationPath .\desktop" />
        <Command code="$appDir = (Resolve-Path -LiteralPath .\desktop).Path" />
        <Command
          code="Get-ChildItem -LiteralPath $appDir -File | Select-Object Name"
          after="The extracted folder contains AgentTM.exe and agenttm-cli.exe. Keep both together."
        />
        <Note>
          The desktop app is portable. Extraction does not add an{" "}
          <code>agenttm</code> terminal command to PATH.
        </Note>
      </Step>
      <Step number={4} title="Launch the app and select your project">
        <p>
          Open the extracted <code>desktop</code> folder in File Explorer and
          double-click <strong>AgentTM.exe</strong>. Or, in the same PowerShell
          window:
        </p>
        <Command
          code="& (Join-Path $appDir 'AgentTM.exe')"
          after="A native AgentTM window opens."
        />
        <ol>
          <li>
            On the welcome screen, click <strong>Open a Git project</strong>.
          </li>
          <li>
            Select your existing Git project folder, not the downloaded app
            folder.
          </li>
          <li>
            If asked, choose <strong>Initialize</strong> to create local AgentTM
            history.
          </li>
          <li>
            Confirm the project name in the sidebar matches the project you
            chose.
          </li>
        </ol>
        <p>
          If a project is already open, click its name in the sidebar to choose
          another project in a separate window.
        </p>
        <Note caution>
          Check the release notes for project-picker availability. Older
          releases may require launching from an initialized project directory;
          use the{" "}
          <a href={platforms.windows.href}>version-specific Windows guide</a> if
          your build has no picker. Unsigned preview builds may show Windows
          reputation warnings; AgentTM is not guaranteed to be warning-free.
        </Note>
        <GuideLink topic="desktop-record">
          Next: your first conversation
        </GuideLink>
      </Step>
    </>
  );
}
function UnixInstall({ os }: { os: "macos" | "linux" }) {
  const [filename, setFilename] = useState("");
  const target = os === "macos" ? "darwin" : "linux";
  const valid =
    new RegExp(
      `^agenttm_[a-zA-Z0-9.+-]+_${target}_(amd64|arm64)\\.tar\\.gz$`,
    ).test(filename) && !filename.includes("VERSION");
  return (
    <>
      <Step number={2} title="Download the matching archive">
        <p>In Terminal, check your device architecture:</p>
        <Command
          code="uname -m"
          after={
            os === "macos"
              ? "arm64 means Apple silicon; x86_64 means Intel."
              : "x86_64 means amd64; aarch64 or arm64 means ARM64."
          }
        />
        <p>
          From <a href={links.releases}>Latest release → Assets</a>, save the
          matching <code>agenttm_VERSION_{target}_ARCH.tar.gz</code>,{" "}
          <code>SHA256SUMS</code>, and <code>install.sh</code> into one new
          empty folder. Use <code>arm64</code> or <code>amd64</code> for ARCH.
          Keep the archive unextracted.
        </p>
        <Note>
          <code>{target}</code> means {os === "macos" ? "macOS" : "Linux"}.
          These CLI archives do not contain a native desktop app.
        </Note>
      </Step>
      <Step number={3} title="Open Terminal in your download folder">
        <p>
          Open the folder where you saved those three files in Terminal. Then
          list its contents:
        </p>
        <Command
          code="ls"
          after="You see the archive, SHA256SUMS, and install.sh together."
        />
        <label className="doc-filename-label" htmlFor="archive-name">
          Enter the exact archive filename shown by ls
        </label>
        <input
          id="archive-name"
          className="doc-filename"
          value={filename}
          onChange={(event) => setFilename(event.target.value.trim())}
          placeholder={`agenttm_0.x.x_${target}_arm64.tar.gz`}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="doc-field-hint">
          Copy the name of your downloaded file, including its actual version
          and architecture. The commands appear only after a matching filename
          is entered.
        </p>
        {filename && !valid && (
          <p className="doc-field-error" role="alert">
            Use the exact {target} CLI .tar.gz filename. Replace VERSION with
            the real version from your download.
          </p>
        )}
        {valid && (
          <>
            <Command
              code={`sh install.sh '${filename}' "$HOME/.local/bin"`}
              after="The installer verifies the SHA256SUMS entry, installs the executable with mode 0755, and prints Installed: .../.local/bin/agenttm."
            />
            <Note caution>
              If validation fails or the destination already exists, stop. Do
              not bypass the checksum or overwrite a running installation.
              Follow the{" "}
              <a href={platforms[os].href}>platform upgrade instructions</a>.
            </Note>
            <Command code={'export PATH="$HOME/.local/bin:$PATH"'} />
            <Command
              code="agenttm version"
              after="The printed version matches the release you downloaded."
            />
            <p>
              The PATH command affects this terminal. For future terminals, add
              that export line once to your shell configuration: usually{" "}
              <code>~/.zshrc</code> for interactive zsh or{" "}
              <code>~/.bashrc</code> for interactive bash.
            </p>
          </>
        )}
      </Step>
    </>
  );
}
export function CLIInstall() {
  const [os, setOS] = useState<OS | null>(null);
  return (
    <>
      <Prerequisites />
      <Step
        number={1}
        title="Choose the operating system where you will run the CLI"
      >
        <div
          className="doc-os-picker"
          role="group"
          aria-label="CLI operating system"
        >
          {(["windows", "macos", "linux"] as OS[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={os === value}
              onClick={() => setOS(value)}
            >
              {platforms[value].label}
            </button>
          ))}
        </div>
        {!os && (
          <Note>
            Choose an operating system above. Its installation steps will appear
            here; do not follow commands intended for another OS.
          </Note>
        )}
      </Step>
      {os === "windows" && (
        <>
          <Step number={2} title="Download the CLI files">
            <p>
              From <a href={links.releases}>Latest release → Assets</a>, save
              one Windows CLI ZIP, <code>SHA256SUMS</code>, and{" "}
              <code>install.ps1</code> together in a new empty folder.
            </p>
            <ul>
              <li>
                Intel/AMD 64-bit: <code>agenttm_VERSION_windows_amd64.zip</code>
              </li>
              <li>
                Windows ARM64: <code>agenttm_VERSION_windows_arm64.zip</code>
              </li>
            </ul>
            <Note>
              Choose the CLI ZIP, not <code>agenttm-desktop_...</code>. Keep it
              unextracted; the installer handles extraction.
            </Note>
          </Step>
          <Step number={3} title="Verify and install the CLI">
            <WindowsVerification desktop={false} />
            <p>
              After the hashes match, run each command separately in that same
              window:
            </p>
            <Command code="Unblock-File -LiteralPath .\install.ps1" />
            <Command
              code=".\install.ps1 -Archive $archive.FullName -ChecksumFile .\SHA256SUMS -AddToPath"
              after="The installer reports agenttm.exe under %LOCALAPPDATA%\AgentTM\bin."
            />
            <p>Open a new PowerShell window so PATH changes take effect.</p>
            <Command
              code="agenttm version"
              after="The version matches the release you downloaded."
            />
            <Note caution>
              If PowerShell still blocks the installer, do not change a managed
              execution policy just to continue. Use the{" "}
              <a href={platforms.windows.href}>
                verified manual installation instructions
              </a>
              . For an existing installation, close AgentTM first and follow the
              explicit upgrade instructions.
            </Note>
          </Step>
        </>
      )}
      {(os === "macos" || os === "linux") && <UnixInstall key={os} os={os} />}
      {os && (
        <GuideLink topic="cli-record">Next: record your first run</GuideLink>
      )}
    </>
  );
}
