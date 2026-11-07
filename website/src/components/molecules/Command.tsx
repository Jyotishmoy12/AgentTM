import { CodeBlock } from './CodeBlock';

export function Command({ code, after }: { code: string; after?: string }) {
  return (
    <div className="doc-command">
      <CodeBlock command={code} />
      {after && (
        <p className="doc-expected">
          <span>Check</span>
          {after}
        </p>
      )}
    </div>
  );
}
