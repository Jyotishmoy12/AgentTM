import { useEffect, useMemo } from 'react';
import { message } from '../api';
import { codexError } from '../codexErrors';
import type { Session } from '../types';
import { useChatActions } from './useChatActions';

export function useChatConversation({
  model: viewModel,
}: {
  model: { resume: string; onRecorded: () => void; sessions: Session[] };
}) {
  const { resume, onRecorded, sessions } = viewModel;
  const {
    bridge,
    session,
    setSession,
    state,
    setState,
    events,
    setEvents,
    cursor,
    prompt,
    setPrompt,
    model,
    setModel,
    sandbox,
    setSandbox,
    error,
    setError,
    busy,
    stopping,
    deciding,
    setDeciding,
    loading,
    setLoading,
    pending,
    setPending,
    localPrompts,
    setLocalPrompts,
    transcript,
    approvals,
    conversationMenu,
    follow,
    jump,
    setJump,
    more,
    send,
    stop,
  } = useChatActions({ model: { resume, onRecorded } });
  async function decide(id: string, allow: boolean) {
    if (!bridge || deciding) return;
    setDeciding(id);
    try {
      await bridge.DecideChat(id, allow);
      setState(await bridge.ChatStatus());
    } catch (e) {
      setError(message(e));
    } finally {
      setDeciding('');
    }
  }
  function choose(id: string) {
    if (state?.running || busy) return;
    setSession(id);
    setLoading(!!id);
    setEvents([]);
    setPending(null);
    setLocalPrompts(new Map());
    setError('');
    setPrompt('');
    follow.current = true;
    if (conversationMenu.current) conversationMenu.current.open = false;
  }
  const current = state?.session_id === session ? state : null;
  const selected = sessions.find((s) => s.id === session);
  const locked = busy || !!state?.running;
  const problem = error || current?.error;
  const friendlyError = problem ? codexError(problem) : null;
  const pendingEvent = useMemo(
    () =>
      pending?.session === session
        ? events.find(
            (e) =>
              e.kind === 'agenttm.chat.prompt' &&
              e.sequence > pending.after &&
              Date.parse(e.received_at) >= pending.sentAt,
          )
        : undefined,
    [events, pending, session],
  );
  useEffect(() => {
    if (!pendingEvent || !pending) return;
    setLocalPrompts((previous) => {
      if (previous.get(pendingEvent.id) === pending.text) return previous;
      const next = new Map(previous);
      next.set(pendingEvent.id, pending.text);
      if (next.size > 100) next.delete(next.keys().next().value!);
      return next;
    });
  }, [pendingEvent, pending]);
  const empty = !session && !pending && !current?.running;
  return {
    bridge,
    session,
    state,
    events,
    cursor,
    prompt,
    setPrompt,
    model,
    setModel,
    sandbox,
    setSandbox,
    busy,
    stopping,
    deciding,
    loading,
    pending,
    localPrompts,
    transcript,
    approvals,
    conversationMenu,
    follow,
    jump,
    setJump,
    more,
    send,
    stop,
    decide,
    choose,
    current,
    selected,
    locked,
    friendlyError,
    pendingEvent,
    empty,
  };
}
