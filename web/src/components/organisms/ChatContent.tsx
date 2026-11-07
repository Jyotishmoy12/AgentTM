import { memo } from 'react';
import { inline } from '../../utils/inline';
import { CodeBlock } from '../molecules/CodeBlock';

export const ChatContent = memo(function ChatContent({ text }: { text: string }) {
  return (
    <div className="chat-prose">
      {text
        .split(/(```[\s\S]*?(?:```|$))/g)
        .filter(Boolean)
        .map((part, index) =>
          part.startsWith('```') ? (
            <CodeBlock text={part} key={index} />
          ) : (
            <div className="chat-text" key={index}>
              {part
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{inline(paragraph)}</p>
                ))}
            </div>
          ),
        )}
    </div>
  );
});
