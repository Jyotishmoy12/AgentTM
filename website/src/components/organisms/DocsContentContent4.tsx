import { links } from '../../content';
import { Command } from '../molecules/Command';

export function DocsContentContent4() {
  return (
    <>
      <p className="doc-lead">
        Stop at the first failed step. Read the exact message before retrying; do not continue with
        missing files, failed checksums, or an unverified destination.
      </p>
      {[
        [
          'The terminal cannot find agenttm',
          'CLI: open a new terminal after PATH changes. Windows normally installs to %LOCALAPPDATA%\\AgentTM\\bin. Desktop extraction does not install that global command; launch AgentTM.exe instead.',
        ],
        [
          'Codex executable not found',
          'Install Codex CLI using its official guide, then restart AgentTM so it sees the updated environment. Updated desktop builds also let you choose the installed executable in model setup.',
        ],
        [
          'Codex is installed but sign-in fails',
          'Complete Codex sign-in using its own setup instructions, then rerun agenttm codex doctor in the CLI or Settings → Check again in the desktop app. Do not paste login tokens into AgentTM chat.',
        ],
        [
          'Model access or model not found',
          'Desktop: refresh the model list and choose a model available to your account. CLI: pass --model followed by an actual available model ID before -- and the prompt. Example model names are not available to every account.',
        ],
        [
          'Port 7331 is already occupied',
          'CLI: leave the existing server alone if you still use it. Start another dashboard with the separate command below and open the URL it prints.',
        ],
        [
          'Checksum entry is missing or the hashes differ',
          'Do not extract or install. Confirm the archive and SHA256SUMS came from the same release and the manifest names that exact archive. Download both again if needed.',
        ],
        [
          'install.ps1 is missing',
          'That script is downloaded separately for CLI installation. The desktop ZIP does not contain or use it. Return to the correct installation path.',
        ],
        [
          'Permission denied or destination already exists',
          "Use a writable user-owned destination. Close AgentTM before replacing its executable. Follow your platform's explicit upgrade instructions; do not overwrite history or bypass a managed policy.",
        ],
        [
          'No window after choosing another project',
          'Use a build containing the visible-window launch fix. Reopen the updated AgentTM.exe, choose an existing Git project, and check for an initialization prompt in the new window.',
        ],
      ].map(([title, description]) => (
        <section className="doc-trouble" key={title}>
          <h2>{title}</h2>
          <p>{description}</p>
        </section>
      ))}
      <Command
        code="agenttm ui --port 7332"
        after="Use the actual address printed by this command; the server normally uses 127.0.0.1:7332."
      />
      <p>
        For unresolved issues, include the AgentTM version, operating system, failing step, and
        sanitized error. Do not post passphrases, tokens, or private captured files.{' '}
        <a href={links.repo + '/issues'}>Open an issue</a>.
      </p>
    </>
  );
}
