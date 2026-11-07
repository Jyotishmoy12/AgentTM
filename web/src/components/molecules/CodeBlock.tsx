import { useState } from 'react';
import { copyText, desktopBridge } from '../../handlers/native';

export function CodeBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const body = text.slice(3).replace(/```$/, '');
  const newline = body.indexOf('\n');
  const language = newline < 0 ? '' : body.slice(0, newline).trim();
  const code = newline < 0 ? body : body.slice(newline + 1);
  async function copy() {
    try {
      if (desktopBridge()?.CopyText) await desktopBridge()!.CopyText(code);
      else await copyText(code);
      setCopied(true);
      setError('');
    } catch {
      setError('Could not copy. Select the code to copy it manually.');
    }
  }
  return (
    <div className="chat-code-block">
      <div>
        <span>{language || 'Code'}</span>
        <button type="button" onClick={copy} aria-label="Copy code">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
      {error && <small role="status">{error}</small>}
    </div>
  );
}
