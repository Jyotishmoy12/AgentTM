import { useLayoutEffect } from 'react';
import type { useChatConversation } from './useChatConversation';
export function useTranscriptNavigation(view: ReturnType<typeof useChatConversation>) {
  useLayoutEffect(() => {
    if (view.follow.current && view.transcript.current)
      view.transcript.current.scrollTop = view.transcript.current.scrollHeight;
  }, [
    view.events,
    view.current?.draft,
    view.current?.approvals.length,
    view.pending,
    view.session,
  ]);
  function latest() {
    view.follow.current = true;
    view.setJump(false);
    const node = view.transcript.current;
    if (node)
      node.scrollTo({
        top: node.scrollHeight,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
  }

  return latest;
}
