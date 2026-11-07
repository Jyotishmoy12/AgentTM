import { useTranscriptNavigation } from '../hooks/useTranscriptNavigation';
import { useMemo } from 'react';
import { ChatIcon } from '../components/atoms/ChatIcon';
import { ChatUnavailable } from '../components/molecules/ChatUnavailable';
import { ChatWelcome } from '../components/molecules/ChatWelcome';
import { ChatApprovals } from '../components/organisms/ChatApprovals';
import { ChatComposeDock } from '../components/organisms/ChatComposeDock';
import { ChatContent } from '../components/organisms/ChatContent';
import { ChatConversationHeader } from '../components/organisms/ChatConversationHeader';
import { ChatDetails } from '../components/organisms/ChatDetails';
import { useChatConversation } from '../hooks/useChatConversation';
import { record } from '../state';
import type { ChatPageProps } from '../types/ChatPageProps';

export function ChatPage({
  resume,
  sessions,
  onRecorded,
  project,
  promptMode,
  onInspect,
}: ChatPageProps) {
  const view = useChatConversation({ model: { resume, onRecorded, sessions } });
  const completedCalls = useMemo(
    () =>
      new Set(
        view.events
          .filter((e) => e.kind === 'item.completed' && e.tool_call_id)
          .map((e) => e.tool_call_id),
      ),
    [view.events],
  );
  const latest = useTranscriptNavigation(view);
  if (!view.bridge) return <ChatUnavailable />;
  return (
    <section
      className={
        'chat-page editorial-chat ' + (view.empty ? 'chat-empty-state' : 'chat-active-state')
      }
      aria-label="Codex workspace"
    >
      <ChatConversationHeader model={{ ...view, project, onInspect, sessions }} />
      <div className="chat-reading-area">
        <div
          ref={view.transcript}
          className="chat-transcript"
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
          aria-relevant="additions text"
          onScroll={(event) => {
            const el = event.currentTarget;
            view.follow.current = el.scrollHeight - el.clientHeight - el.scrollTop < 80;
            view.setJump(!view.follow.current);
          }}
        >
          <div className="chat-content-column">
            {view.empty ? (
              <ChatWelcome />
            ) : (
              <>
                {view.loading && !view.events.length && !view.pending && (
                  <p className="chat-system-note">Loading your conversation…</p>
                )}
                {view.events.map((event) => {
                  const p = record(event.payload),
                    item = record(p.item);
                  if (event.kind === 'agenttm.chat.prompt')
                    return (
                      <article className="chat-message user" key={event.id}>
                        <div className="chat-message-heading">You</div>
                        <ChatContent
                          text={
                            view.localPrompts.get(event.id) ||
                            (view.pendingEvent?.id === event.id && view.pending
                              ? view.pending.text
                              : String(p.text ?? '[Prompt text capture is off]'))
                          }
                        />
                      </article>
                    );
                  if (event.kind === 'item.completed' && item.type === 'agent_message')
                    return (
                      <article className="chat-message assistant" key={event.id}>
                        <div className="chat-message-heading">
                          <ChatIcon name="spark" />
                          Codex
                        </div>
                        <ChatContent text={String(item.text ?? '')} />
                      </article>
                    );
                  if (
                    event.tool_name &&
                    (event.kind === 'item.completed' ||
                      (event.kind === 'item.started' &&
                        view.current?.running &&
                        !!event.tool_call_id &&
                        !completedCalls.has(event.tool_call_id)))
                  ) {
                    const failed =
                      item.status === 'failed' ||
                      (typeof item.exit_code === 'number' && item.exit_code !== 0);
                    const status = failed
                      ? 'Failed'
                      : event.kind === 'item.started'
                        ? 'Started'
                        : String(item.status ?? 'Observed');
                    return (
                      <ChatDetails
                        model={{ failed, event, status, item, onInspect, session: view.session }}
                      />
                    );
                  }
                  if (event.kind === 'error' || event.kind.endsWith('.failed'))
                    return (
                      <div className="chat-system-error" role="alert" key={event.id}>
                        {String(
                          p.message ??
                            record(p.error).message ??
                            'A failure was recorded for this turn. View history for details.',
                        )}
                      </div>
                    );
                  return null;
                })}
                {view.pending?.session === view.session && !view.pendingEvent && (
                  <article className="chat-message user">
                    <div className="chat-message-heading">You</div>
                    <ChatContent text={view.pending.text} />
                  </article>
                )}
                {view.cursor !== null && (
                  <button
                    type="button"
                    className="chat-load-more"
                    disabled={view.loading}
                    onClick={view.more}
                  >
                    {view.loading ? 'Loading…' : 'Load more conversation events'}
                  </button>
                )}
                {view.current?.draft && (
                  <article className="chat-message assistant streaming">
                    <div className="chat-message-heading">
                      <ChatIcon name="spark" />
                      Codex<span className="chat-stream-label">Replying</span>
                    </div>
                    <ChatContent text={view.current.draft} />
                  </article>
                )}
                {!!view.current?.approvals.length && (
                  <ChatApprovals model={{ ...view, current: view.current }} />
                )}
                {view.current?.running && !view.current.approvals.length && (
                  <p className="chat-working" role="status">
                    <span />
                    {view.stopping ? 'Stopping turn…' : 'Codex is working…'}
                  </p>
                )}
                {!view.loading &&
                  !view.events.length &&
                  !view.pending &&
                  !view.current?.running && (
                    <p className="chat-system-note">
                      No conversation messages were captured. View history to inspect recorded
                      activity.
                    </p>
                  )}
              </>
            )}
          </div>
        </div>
        {view.jump && !view.empty && (
          <button className="chat-jump-latest" type="button" onClick={latest}>
            Latest messages
            <ChatIcon name="chevron" />
          </button>
        )}
      </div>
      <ChatComposeDock model={{ ...view, bridge: view.bridge, promptMode }} />
    </section>
  );
}
