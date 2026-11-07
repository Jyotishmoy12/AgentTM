import { useEffect, useState } from 'react';
import { copyText } from '../../handlers/clipboard';
import { Icon } from '../atoms/Icon';

export function CodeBlock({ command }: { command: string }) {
  const [result, setResult] = useState('');
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(''), 2200);
    return () => window.clearTimeout(timer);
  }, [result]);
  async function copy() {
    try {
      await copyText(command);
      setResult('Copied');
    } catch {
      setResult('Select and copy the command manually');
    }
  }
  return (
    <div className="code-block">
      <span className="prompt" aria-hidden="true">
        $
      </span>
      <pre>
        <code>{command}</code>
      </pre>
      <button type="button" className="icon-button" aria-label={`Copy ${command}`} onClick={copy}>
        <Icon name={result === 'Copied' ? 'check' : 'copy'} />
      </button>
      <span className="copy-feedback" role="status">
        {result}
      </span>
    </div>
  );
}
