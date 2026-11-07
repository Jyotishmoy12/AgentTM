import { links, platforms } from '../../content';
import { Command } from '../molecules/Command';
import { GuideLink } from '../molecules/GuideLink';
import { Note } from '../molecules/Note';
import { Prerequisites } from '../molecules/Prerequisites';
import { Step } from '../molecules/Step';
import { WindowsVerification } from '../molecules/WindowsVerification';

export function DesktopInstall() {
  return (
    <>
      <Prerequisites desktop />
      <Step number={1} title="Download the desktop files">
        <p>
          Create a new empty download folder. Open{' '}
          <a href={links.releases}>Latest release → Assets</a> and save these two files together:
        </p>
        <ul>
          <li>
            <code>agenttm-desktop_VERSION_windows_amd64.zip</code> — the <strong>desktop</strong>{' '}
            archive.
          </li>
          <li>
            <code>SHA256SUMS</code> — a separate download from that same release.
          </li>
        </ul>
        <p>
          <code>VERSION</code> describes the version in the actual filename; you do not need to type
          it in the commands below.
        </p>
        <Note>
          Do not choose GitHub's “Source code” ZIP or the CLI-only{' '}
          <code>agenttm_VERSION_windows_amd64.zip</code>. The desktop ZIP has no{' '}
          <code>install.ps1</code> installer.
        </Note>
      </Step>
      <Step number={2} title="Verify the ZIP before opening it">
        <WindowsVerification desktop />
      </Step>
      <Step number={3} title="Extract and check the app files">
        <p>
          After the hashes match, stay in the same PowerShell window. Use a fresh destination; if a
          folder named <code>desktop</code> already exists, choose another empty download folder
          first.
        </p>
        <Command code="Expand-Archive -LiteralPath $archive.FullName -DestinationPath .\desktop" />
        <Command code="$appDir = (Resolve-Path -LiteralPath .\desktop).Path" />
        <Command
          code="Get-ChildItem -LiteralPath $appDir -File | Select-Object Name"
          after="The extracted folder contains AgentTM.exe and agenttm-cli.exe. Keep both together."
        />
        <Note>
          The desktop app is portable. Extraction does not add an <code>agenttm</code> terminal
          command to PATH.
        </Note>
      </Step>
      <Step number={4} title="Launch the app and select your project">
        <p>
          Open the extracted <code>desktop</code> folder in File Explorer and double-click{' '}
          <strong>AgentTM.exe</strong>. Or, in the same PowerShell window:
        </p>
        <Command
          code="& (Join-Path $appDir 'AgentTM.exe')"
          after="A native AgentTM window opens."
        />
        <ol>
          <li>
            On the welcome screen, click <strong>Open a Git project</strong>.
          </li>
          <li>Select your existing Git project folder, not the downloaded app folder.</li>
          <li>
            If asked, choose <strong>Initialize</strong> to create local AgentTM history.
          </li>
          <li>Confirm the project name in the sidebar matches the project you chose.</li>
        </ol>
        <p>
          If a project is already open, click its name in the sidebar to choose another project in a
          separate window.
        </p>
        <Note caution>
          Check the release notes for project-picker availability. Older releases may require
          launching from an initialized project directory; use the{' '}
          <a href={platforms.windows.href}>version-specific Windows guide</a> if your build has no
          picker. Unsigned preview builds may show Windows reputation warnings; AgentTM is not
          guaranteed to be warning-free.
        </Note>
        <GuideLink topic="desktop-record">Next: your first conversation</GuideLink>
      </Step>
    </>
  );
}
