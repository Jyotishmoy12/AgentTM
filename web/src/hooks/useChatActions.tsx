import { message } from '../api';
import { useChatTranscript } from './useChatTranscript';

export function useChatActions({
  model: viewModel,
}: {
  model: { resume: string; onRecorded: () => void };
}) {
  const { resume, onRecorded } = viewModel;
  const {
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
  } = useChatTranscript({ model: { resume } });
  async function send() {
    if (!bridge || !prompt.trim() || busy || state?.running) return;
    if (!model.trim()) {
      setError('Choose a Codex model before sending your message.');
      return;
    }
    const text = prompt;
    const sequence = after.current;
    const sentAt = Date.now();
    setBusy(true);
    setError('');
    follow.current = true;
    try {
      const id = await bridge.StartChat(session, text, model, sandbox);
      setPending({
        session: id,
        text,
        after: id === session ? sequence : 0,
        sentAt,
      });
      setSession(id);
      setPrompt('');
      setState({
        session_id: id,
        running: true,
        draft: '',
        error: '',
        approvals: [],
      });
      onRecorded();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    if (!bridge || stopping) return;
    setStopping(true);
    try {
      await bridge.StopChat();
      const current = await bridge.ChatStatus();
      setState(current);
      if (!current.running) setStopping(false);
    } catch (e) {
      setError(message(e));
      setStopping(false);
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
  };
}
