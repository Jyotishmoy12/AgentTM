import type { ChatState } from '../../desktop';
import { ChatIcon } from '../atoms/ChatIcon';

export function ChatApprovals({
  model: viewModel,
}: {
  model: {
    approvals: import('react').RefObject<HTMLDivElement | null>;
    current: ChatState;
    deciding: string;
    decide: (id: string, allow: boolean) => Promise<void>;
  };
}) {
  const { approvals, current, deciding, decide } = viewModel;
  return (
    <div className="chat-approvals" ref={approvals}>
      {current.approvals.map((approval) => (
        <section key={approval.id}>
          <span className="chat-approval-eyebrow">
            <ChatIcon name="shield" />
            YOUR PERMISSION
          </span>
          <h2>Codex needs your approval</h2>
          <p>{approval.reason || approval.method}</p>
          <pre tabIndex={0}>{approval.command || 'Approve the proposed file changes?'}</pre>
          {approval.directory && (
            <p className="chat-approval-location">Location: {approval.directory}</p>
          )}
          <div className="chat-approval-actions">
            <button type="button" disabled={!!deciding} onClick={() => decide(approval.id, false)}>
              Decline
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!!deciding}
              onClick={() => decide(approval.id, true)}
            >
              {deciding === approval.id ? 'Sending decision…' : 'Allow once'}
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
