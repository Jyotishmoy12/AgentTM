import { useEffect } from 'react';
import { message } from '../api';
import { listChatEvents } from '../handlers/events';
import { useChatStatus } from './useChatStatus';

export function useChatTranscript({ model: viewModel }: { model: { resume: string } }) {
  const { resume } = viewModel;
  const {
    bridge,
    session,
    setSession,
    state,
    setState,
    events,
    setEvents,
    cursor,
    setCursor,
    after,
    prompt,
    setPrompt,
    model,
    setModel,
    sandbox,
    setSandbox,
    error,
    setError,
    busy,
    setBusy,
    stopping,
    setStopping,
    deciding,
    setDeciding,
    revision,
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
    activeSession,
    jump,
    setJump,
  } = useChatStatus({ model: { resume } });
  useEffect(() => {
    if (!session) {
      setEvents([]);
      setCursor(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    if (after.current === 0) setLoading(true);
    listChatEvents(session, after.current, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setEvents((previous) => [
          ...previous,
          ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
        ]);
        after.current = page.items.at(-1)?.sequence ?? after.current;
        setCursor(page.next_cursor);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session, revision]);
  async function more() {
    if (cursor === null || loading) return;
    const id = session;
    setLoading(true);
    try {
      const page = await listChatEvents(id, after.current);
      if (activeSession.current !== id) return;
      setEvents((previous) => [
        ...previous,
        ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
      ]);
      after.current = page.items.at(-1)?.sequence ?? after.current;
      setCursor(page.next_cursor);
    } catch (e) {
      if (activeSession.current === id) setError(message(e));
    } finally {
      if (activeSession.current === id) setLoading(false);
    }
  }
  return {
    bridge,
    session,
    setSession,
    state,
    setState,
    events,
    setEvents,
    cursor,
    after,
    prompt,
    setPrompt,
    model,
    setModel,
    sandbox,
    setSandbox,
    error,
    setError,
    busy,
    setBusy,
    stopping,
    setStopping,
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
  };
}
