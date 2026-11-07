import { useEffect, useRef, useState } from 'react';
import type { ChatState } from '../desktop';
import { desktopFeatures } from '../desktop';
import type { RecordedEvent } from '../types';

export function useChatState({ model: viewModel }: { model: { resume: string } }) {
  const { resume } = viewModel;
  const bridge = desktopFeatures();
  const [session, setSession] = useState(resume);
  const [state, setState] = useState<ChatState | null>(null);
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const after = useRef(0);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [sandbox, setSandbox] = useState('read-only');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [deciding, setDeciding] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(!!resume);
  const [pending, setPending] = useState<{
    session: string;
    text: string;
    after: number;
    sentAt: number;
  } | null>(null);
  const [localPrompts, setLocalPrompts] = useState(new Map<string, string>());
  const transcript = useRef<HTMLDivElement>(null);
  const approvals = useRef<HTMLDivElement>(null);
  const conversationMenu = useRef<HTMLDetailsElement>(null);
  const follow = useRef(true);
  const activeSession = useRef(session);
  activeSession.current = session;
  const [jump, setJump] = useState(false);
  useEffect(() => {
    setSession(resume);
  }, [resume]);
  useEffect(() => {
    after.current = 0;
    setEvents([]);
    setCursor(null);
    follow.current = true;
    setJump(false);
  }, [session]);
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
  };
}
