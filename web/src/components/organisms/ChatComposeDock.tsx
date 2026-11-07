import type { ChatState } from '../../desktop';
import { ChatIcon } from '../atoms/ChatIcon';
import { ChatChatComposer } from './ChatChatComposer';

export function ChatComposeDock({
  model: viewModel,
}: {
  model: {
    current: ChatState | null;
    follow: import('react').RefObject<boolean>;
    approvals: import('react').RefObject<HTMLDivElement | null>;
    friendlyError: { title: string; detail: string; action: string } | null;
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
    promptMode: string;
  };
}) {
  const {
    current,
    follow,
    approvals,
    friendlyError,
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
    promptMode,
  } = viewModel;
  return (
    <div className="chat-compose-dock">
      {!!current?.approvals.length && (
        <button
          type="button"
          className="chat-attention-strip"
          onClick={() => {
            follow.current = true;
            approvals.current?.scrollIntoView({ block: 'end' });
          }}
        >
          <ChatIcon name="shield" />
          {current.approvals.length} approval
          {current.approvals.length === 1 ? '' : 's'} waiting for your decision<span>Review</span>
        </button>
      )}
      {friendlyError && (
        <div className="error-box chat-error" role="alert">
          <strong>{friendlyError.title}</strong>
          <p>{friendlyError.detail}</p>
          <p>{friendlyError.action}</p>
        </div>
      )}
      <ChatChatComposer
        model={{
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
        }}
      />
      <div className="chat-composer-footnote">
        <span>
          <span className={'chat-recording-dot ' + (current?.running ? 'recording' : '')} />
          {busy
            ? 'Starting turn…'
            : current?.running
              ? 'Recording this turn'
              : session
                ? 'Recorded conversation'
                : 'Records when you send'}
          <span className="chat-footnote-divider">·</span>
          {promptMode === 'sanitized' ? 'Sanitized prompts saved locally' : 'Prompt capture off'}
        </span>
        <span>Ctrl+Enter to send</span>
      </div>
    </div>
  );
}
