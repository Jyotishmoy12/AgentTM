import { Icon } from '../atoms/Icon';

export function Prerequisites({ desktop = false }: { desktop?: boolean }) {
  return (
    <ul className="doc-checklist">
      <li>
        <Icon name="check" />
        <span>
          <strong>Git 2.42+ and a Git working tree.</strong> An ordinary folder alone is not enough;
          AgentTM needs a Git project.
        </span>
      </li>
      {desktop && (
        <li>
          <Icon name="check" />
          <span>
            <strong>Windows Intel/AMD 64-bit and WebView2.</strong> The native desktop preview is
            not a macOS or Linux app.{' '}
            <a href="https://developer.microsoft.com/microsoft-edge/webview2/">Get WebView2</a>.
          </span>
        </li>
      )}
      <li>
        <Icon name="check" />
        <span>
          <strong>Codex CLI, installed and signed in, for new recordings.</strong> You can inspect
          existing history without it.{' '}
          <a href="https://developers.openai.com/codex/cli">Official Codex setup</a>.
        </span>
      </li>
      <li>
        <Icon name="check" />
        <span>
          <strong>No Go or Node.js required for prebuilt AgentTM.</strong> Installing Codex itself
          has its own prerequisites.
        </span>
      </li>
    </ul>
  );
}
