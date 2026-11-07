import { platforms } from '../../content';
import { Icon } from '../atoms/Icon';

export function DocsInstallContent2() {
  return (
    <>
      <h3>A native window for your local history.</h3>
      <p>
        The Windows desktop preview includes interactive Codex chat, saved conversation
        continuation, and history backup tools.
      </p>
      <ol className="prose-steps">
        <li>
          Download the separate <code>agenttm-desktop_VERSION_windows_amd64.zip</code> and{' '}
          <code>SHA256SUMS</code> from the same release.
        </li>
        <li>
          Follow the Windows guide to verify the archive, then extract it. Keep{' '}
          <code>AgentTM.exe</code> and <code>agenttm-cli.exe</code> together.
        </li>
        <li>
          Follow the launch steps for your release. Newer source builds include a project picker;
          older releases may need a project-directory launch. Check the guide and release notes.
        </li>
      </ol>
      <div className="docs-callout">
        Requires Git and WebView2. The preview is unsigned; Windows reputation warnings may occur.
        There is no native macOS or Linux desktop release.
      </div>
      <a className="button button-secondary" href={platforms.windows.href}>
        Windows desktop guide <Icon name="arrow" />
      </a>
    </>
  );
}
