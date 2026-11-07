import { ChatIcon } from '../atoms/ChatIcon';
export function ChatWelcome() {
  return (
    <div className="chat-welcome">
      <span className="chat-welcome-symbol">
        <ChatIcon name="spark" />
      </span>
      <h2>What are we building today?</h2>
      <p>Your Codex session, recorded with AgentTM.</p>
    </div>
  );
}
