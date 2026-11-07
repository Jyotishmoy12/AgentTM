import type { Session } from '../../types';
import { ChatIcon } from '../atoms/ChatIcon';

export function ChatConversationHeader({
  model: viewModel,
}: {
  model: {
    selected: Session | undefined;
    session: string;
    project: string;
    onInspect: (id: string) => void;
    conversationMenu: import('react').RefObject<HTMLDetailsElement | null>;
    locked: boolean;
    choose: (id: string) => void;
    sessions: Session[];
  };
}) {
  const { selected, session, project, onInspect, conversationMenu, locked, choose, sessions } =
    viewModel;
  return (
    <header className="chat-conversation-header">
      <div className="chat-identity">
        <h1>Chat with Codex</h1>
        <p title={selected?.title || session}>
          {project}
          <span>/</span>
          {selected?.title ||
            (session ? 'Conversation · ' + session.slice(0, 8) : 'New conversation')}
        </p>
      </div>
      <div className="chat-header-actions">
        {session && (
          <button
            type="button"
            className="chat-history-link"
            onClick={() => onInspect(session)}
            title="Open recorded events and workspace checkpoints"
          >
            <ChatIcon name="layers" />
            <span>View history</span>
          </button>
        )}
        <details
          className="chat-conversation-menu"
          ref={conversationMenu}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}
        >
          <summary
            aria-label="Saved conversations"
            aria-disabled={locked}
            onClick={(event) => {
              if (locked) event.preventDefault();
            }}
            title="Saved conversations"
          >
            <ChatIcon name="history" />
          </summary>
          <div className="chat-saved-panel">
            <label>
              Saved conversations
              <select
                aria-label="Chat conversation"
                disabled={locked}
                value={session}
                onChange={(event) => choose(event.target.value)}
              >
                <option value="">New conversation</option>
                {sessions
                  .filter((s) => s.resumable || s.id === session)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title ? s.title + ' · ' : ''}
                      {s.id.slice(0, 8)} · {new Date(s.started_at).toLocaleString()}
                    </option>
                  ))}
                {session && !sessions.some((s) => s.id === session) && (
                  <option value={session}>{session.slice(0, 8)}</option>
                )}
              </select>
            </label>
            <button type="button" disabled={locked} onClick={() => choose('')}>
              <ChatIcon name="plus" />
              New conversation
            </button>
          </div>
        </details>
        <button
          type="button"
          className="chat-icon-button"
          aria-label="New conversation"
          title="New conversation"
          disabled={locked}
          onClick={() => choose('')}
        >
          <ChatIcon name="plus" />
        </button>
      </div>
    </header>
  );
}
