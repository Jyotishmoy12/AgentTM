import { Icon } from '../atoms/Icon';

export function DocsInstallContent() {
  return (
    <>
      <h3>A few things before your first run.</h3>
      <p>AgentTM builds on the tools already in your workflow.</p>
      <ul className="requirements">
        <li>
          <Icon name="check" />
          <div>
            <strong>Git 2.42+ and a Git working tree</strong>
            <p>Use an existing Git project, or a disposable repository for your first test.</p>
          </div>
        </li>
        <li>
          <Icon name="check" />
          <div>
            <strong>Installed and authenticated Codex CLI</strong>
            <p>
              Required for new recordings. Check setup with <code>agenttm codex doctor</code>.
            </p>
          </div>
        </li>
        <li>
          <Icon name="check" />
          <div>
            <strong>The binary for your operating system</strong>
            <p>
              Windows desktop is a separate amd64 ZIP. CLI archives support Windows, macOS, and
              Linux.
            </p>
          </div>
        </li>
        <li>
          <Icon name="check" />
          <div>
            <strong>WebView2 for Windows desktop</strong>
            <p>The native preview uses Microsoft Edge WebView2 Evergreen Runtime.</p>
          </div>
        </li>
      </ul>
      <p>
        Go and Node.js are not needed to run prebuilt AgentTM releases. Codex has its own
        installation prerequisites.
      </p>
    </>
  );
}
