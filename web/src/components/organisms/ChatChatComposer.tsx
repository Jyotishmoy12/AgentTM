import type { ChatState } from '../../desktop';
import { ChatIcon } from '../atoms/ChatIcon';
import { ModelPicker } from '../molecules/ModelPicker';

export function ChatChatComposer({
  model: viewModel,
}: {
  model: {
    send: () => Promise<void>;
    session: string;
    prompt: string;
    setPrompt: import('react').Dispatch<import('react').SetStateAction<string>>;
    locked: boolean;
    bridge: import('../../desktop').FeatureBridge;
    model: string;
    setModel: import('react').Dispatch<import('react').SetStateAction<string>>;
    sandbox: string;
    setSandbox: import('react').Dispatch<import('react').SetStateAction<string>>;
    state: ChatState | null;
    stopping: boolean;
    stop: () => Promise<void>;
    busy: boolean;
  };
}) {
  const {
    send,
    session,
    prompt,
    setPrompt,
    locked,
    bridge,
    model,
    setModel,
    sandbox,
    setSandbox,
    state,
    stopping,
    stop,
    busy,
  } = viewModel;
  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <label className="sr-only" htmlFor="chat-message">
        {session ? 'Your follow-up' : 'Your message'}
      </label>
      <textarea
        id="chat-message"
        value={prompt}
        rows={3}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            (event.ctrlKey || event.metaKey) &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Ask Codex anything about your project…"
        maxLength={32000}
        disabled={locked}
      />
      <div className="chat-composer-toolbar">
        <div className="chat-composer-controls">
          <ModelPicker bridge={bridge} value={model} onChange={setModel} disabled={locked} />
          <label className="chat-permission-control">
            <ChatIcon name="shield" />
            <span className="sr-only">Permissions</span>
            <select
              aria-label="Chat permissions"
              value={sandbox}
              onChange={(event) => setSandbox(event.target.value)}
              disabled={locked}
            >
              <option value="read-only">Read only</option>
              <option value="workspace-write">Allow project edits</option>
            </select>
          </label>
        </div>
        {state?.running ? (
          <button
            className="chat-send chat-stop"
            type="button"
            disabled={stopping}
            aria-label="Stop turn"
            title="Stop turn"
            onClick={stop}
          >
            <ChatIcon name="stop" />
          </button>
        ) : (
          <button
            className="chat-send"
            type="submit"
            aria-label={busy ? 'Starting…' : session ? 'Continue conversation' : 'Send to Codex'}
            title={busy ? 'Starting…' : 'Send message (Ctrl+Enter)'}
            disabled={busy || !prompt.trim() || !model.trim()}
          >
            <ChatIcon name="arrow" />
          </button>
        )}
      </div>
    </form>
  );
}
