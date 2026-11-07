import type { RecordedEvent } from '../../types';
import { ChatIcon } from '../atoms/ChatIcon';

export function ChatDetails({
  model: viewModel,
}: {
  model: {
    failed: boolean;
    event: RecordedEvent;
    status: string;
    item: Record<string, unknown>;
    onInspect: (id: string) => void;
    session: string;
  };
}) {
  const { failed, event, status, item, onInspect, session } = viewModel;
  if (!event.tool_name) return null;
  return (
    <details
      className={'chat-tool ' + (failed ? 'chat-tool-failed' : '')}
      key={event.id}
      open={failed ? true : undefined}
    >
      <summary>
        <ChatIcon name="tool" />
        <span>{event.tool_name.replaceAll('_', ' ')}</span>
        <span className="chat-tool-state">{status}</span>
      </summary>
      {failed && (
        <p className="chat-tool-failure" role="alert">
          Tool execution failed
          {typeof item.exit_code === 'number' ? ' (exit ' + item.exit_code + ')' : ''}. Review the
          recorded output below.
        </p>
      )}
      <pre tabIndex={0}>
        {String(item.command ?? '')}
        {item.aggregated_output ? '\n' + String(item.aggregated_output) : ''}
        {!item.command && !item.aggregated_output ? JSON.stringify(item, null, 2) : ''}
      </pre>
      {event.checkpoint_id && (
        <button type="button" className="chat-tool-history" onClick={() => onInspect(session)}>
          View captured workspace in history
        </button>
      )}
    </details>
  );
}
