export function ChatUnavailable() {
  return (
    <div className="page-scroll">
      <div className="page-empty">
        <h2>Chat is available in the desktop app</h2>
        <p>
          Open the native AgentTM app to chat with Codex, answer approval requests, and continue
          recorded conversations.
        </p>
        <code>agenttm run codex -- "your task"</code>
        <p>The browser can still inspect recordings started from the CLI.</p>
      </div>
    </div>
  );
}
