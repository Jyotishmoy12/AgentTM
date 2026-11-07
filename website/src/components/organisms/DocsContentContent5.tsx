import { Icon } from '../atoms/Icon';
import { GuideLink } from '../molecules/GuideLink';
import { Note } from '../molecules/Note';
import { Prerequisites } from '../molecules/Prerequisites';

export function DocsContentContent5() {
  return (
    <>
      <p className="doc-lead">
        Two ways to use AgentTM. Choose the experience you want, then follow that guide from start
        to finish.
      </p>
      <div className="doc-paths">
        <a href="#desktop-install">
          <Icon name="layers" />
          <span className="doc-path-tag">WINDOWS · NATIVE APP</span>
          <h2>Desktop</h2>
          <p>
            Chat with Codex, inspect history, restore workspaces, and manage backups in a native
            window.
          </p>
          <strong>
            Install the desktop app <Icon name="arrow" />
          </strong>
        </a>
        <a href="#cli-install">
          <Icon name="terminal" />
          <span className="doc-path-tag">WINDOWS · MACOS · LINUX</span>
          <h2>CLI + browser</h2>
          <p>
            Record from your terminal and explore sessions, captured files, and diffs in your
            browser.
          </p>
          <strong>
            Install the CLI <Icon name="arrow" />
          </strong>
        </a>
      </div>
      <Note>
        Desktop and CLI are separate downloads. The desktop ZIP includes <code>AgentTM.exe</code>{' '}
        and <code>agenttm-cli.exe</code>; the CLI archive includes the <code>agenttm</code> terminal
        executable.
      </Note>
      <h2>Before you begin</h2>
      <Prerequisites />
      <h2>Already installed?</h2>
      <p>
        <GuideLink topic="desktop-record">Start a desktop conversation</GuideLink>{' '}
        <GuideLink topic="cli-record">Record from the terminal</GuideLink>
      </p>
      <Note>
        These guides describe the current implementation. Features and launch steps depend on your
        downloaded release. Always check its notes and Assets.
      </Note>
    </>
  );
}
