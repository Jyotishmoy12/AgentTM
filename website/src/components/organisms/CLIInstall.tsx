import { useState } from 'react';
import { links, platforms } from '../../content';
import type { OS } from '../../types/DocsInstall';
import { Command } from '../molecules/Command';
import { GuideLink } from '../molecules/GuideLink';
import { Note } from '../molecules/Note';
import { Prerequisites } from '../molecules/Prerequisites';
import { Step } from '../molecules/Step';
import { UnixInstall } from '../molecules/UnixInstall';
import { WindowsVerification } from '../molecules/WindowsVerification';

export function CLIInstall() {
  const [os, setOS] = useState<OS | null>(null);
  return (
    <>
      <Prerequisites />
      <Step number={1} title="Choose the operating system where you will run the CLI">
        <div className="doc-os-picker" role="group" aria-label="CLI operating system">
          {(['windows', 'macos', 'linux'] as OS[]).map((value) => (
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
            Choose an operating system above. Its installation steps will appear here; do not follow
            commands intended for another OS.
          </Note>
        )}
      </Step>
      {os === 'windows' && (
        <>
          <Step number={2} title="Download the CLI files">
            <p>
              From <a href={links.releases}>Latest release → Assets</a>, save one Windows CLI ZIP,{' '}
              <code>SHA256SUMS</code>, and <code>install.ps1</code> together in a new empty folder.
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
              Choose the CLI ZIP, not <code>agenttm-desktop_...</code>. Keep it unextracted; the
              installer handles extraction.
            </Note>
          </Step>
          <Step number={3} title="Verify and install the CLI">
            <WindowsVerification desktop={false} />
            <p>After the hashes match, run each command separately in that same window:</p>
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
              If PowerShell still blocks the installer, do not change a managed execution policy
              just to continue. Use the{' '}
              <a href={platforms.windows.href}>verified manual installation instructions</a>. For an
              existing installation, close AgentTM first and follow the explicit upgrade
              instructions.
            </Note>
          </Step>
        </>
      )}
      {(os === 'macos' || os === 'linux') && <UnixInstall key={os} os={os} />}
      {os && <GuideLink topic="cli-record">Next: record your first run</GuideLink>}
    </>
  );
}
