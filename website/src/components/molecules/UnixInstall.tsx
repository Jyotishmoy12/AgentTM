import { useState } from 'react';
import { links, platforms } from '../../content';
import { Command } from './Command';
import { Note } from './Note';
import { Step } from './Step';

export function UnixInstall({ os }: { os: 'macos' | 'linux' }) {
  const [filename, setFilename] = useState('');
  const target = os === 'macos' ? 'darwin' : 'linux';
  const valid =
    new RegExp(`^agenttm_[a-zA-Z0-9.+-]+_${target}_(amd64|arm64)\\.tar\\.gz$`).test(filename) &&
    !filename.includes('VERSION');
  return (
    <>
      <Step number={2} title="Download the matching archive">
        <p>In Terminal, check your device architecture:</p>
        <Command
          code="uname -m"
          after={
            os === 'macos'
              ? 'arm64 means Apple silicon; x86_64 means Intel.'
              : 'x86_64 means amd64; aarch64 or arm64 means ARM64.'
          }
        />
        <p>
          From <a href={links.releases}>Latest release → Assets</a>, save the matching{' '}
          <code>agenttm_VERSION_{target}_ARCH.tar.gz</code>, <code>SHA256SUMS</code>, and{' '}
          <code>install.sh</code> into one new empty folder. Use <code>arm64</code> or{' '}
          <code>amd64</code> for ARCH. Keep the archive unextracted.
        </p>
        <Note>
          <code>{target}</code> means {os === 'macos' ? 'macOS' : 'Linux'}. These CLI archives do
          not contain a native desktop app.
        </Note>
      </Step>
      <Step number={3} title="Open Terminal in your download folder">
        <p>
          Open the folder where you saved those three files in Terminal. Then list its contents:
        </p>
        <Command code="ls" after="You see the archive, SHA256SUMS, and install.sh together." />
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
          Copy the name of your downloaded file, including its actual version and architecture. The
          commands appear only after a matching filename is entered.
        </p>
        {filename && !valid && (
          <p className="doc-field-error" role="alert">
            Use the exact {target} CLI .tar.gz filename. Replace VERSION with the real version from
            your download.
          </p>
        )}
        {valid && (
          <>
            <Command
              code={`sh install.sh '${filename}' "$HOME/.local/bin"`}
              after="The installer verifies the SHA256SUMS entry, installs the executable with mode 0755, and prints Installed: .../.local/bin/agenttm."
            />
            <Note caution>
              If validation fails or the destination already exists, stop. Do not bypass the
              checksum or overwrite a running installation. Follow the{' '}
              <a href={platforms[os].href}>platform upgrade instructions</a>.
            </Note>
            <Command code={'export PATH="$HOME/.local/bin:$PATH"'} />
            <Command
              code="agenttm version"
              after="The printed version matches the release you downloaded."
            />
            <p>
              The PATH command affects this terminal. For future terminals, add that export line
              once to your shell configuration: usually <code>~/.zshrc</code> for interactive zsh or{' '}
              <code>~/.bashrc</code> for interactive bash.
            </p>
          </>
        )}
      </Step>
    </>
  );
}
