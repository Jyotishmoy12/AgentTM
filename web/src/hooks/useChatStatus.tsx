import { useEffect } from 'react';
import { message } from '../api';
import { useChatState } from './useChatState';

export function useChatStatus({ model: viewModel }: { model: { resume: string } }) {
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
    setRevision,
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
  } = useChatState({ model: { resume } });
  useEffect(() => {
    if (!bridge) return;
    let disposed = false,
      querying = false;
    async function poll() {
      if (querying) return;
      querying = true;
      try {
        const current = await bridge!.ChatStatus();
        if (!disposed) {
          setState(current);
          if (current.running && current.session_id) setSession(current.session_id);
          if (!current.running) setStopping(false);
          setRevision((n) => n + 1);
        }
      } catch (e) {
        if (!disposed) setError(message(e));
      } finally {
        querying = false;
      }
    }
    void poll();
    const timer = setInterval(poll, 1500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [!!bridge]);
  return {
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
  };
}
