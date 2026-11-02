import { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor/editor';

type Props = { content: string; path: string; diff?: boolean };
function language(path: string): string {
  const extension = path.split('.').at(-1)?.toLowerCase();
  return ({ go: 'go', ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', md: 'markdown', py: 'python', rs: 'rust', cpp: 'cpp', h: 'cpp', css: 'css', html: 'html', sql: 'sql', sh: 'shell', yml: 'yaml', yaml: 'yaml' } as Record<string, string>)[extension ?? ''] ?? 'plaintext';
}
let editorModule: Promise<typeof import('../monaco')> | null = null;
function loadMonaco() {
  editorModule ??= import('../monaco');
  return editorModule;
}
export function CodeViewer({ content, path, diff }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    let disposed = false;
    let instance: Monaco.editor.IStandaloneCodeEditor | undefined;
    let model: Monaco.editor.ITextModel | undefined;
    setFallback(false);
    loadMonaco().then(monaco => {
      if (disposed || !host.current) return;
      monaco.editor.defineTheme('agenttm', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#10141d', 'editorLineNumber.foreground': '#586277', 'editorGutter.background': '#10141d', 'editor.selectionBackground': '#34435e' } });
      model = monaco.editor.createModel(content, diff ? 'diff' : language(path));
      instance = monaco.editor.create(host.current, {
        model, theme: 'agenttm', readOnly: true, domReadOnly: true, automaticLayout: true,
        fontFamily: 'Cascadia Code, Consolas, monospace', fontSize: 13, lineHeight: 22,
        minimap: { enabled: false }, scrollBeyondLastLine: false, renderLineHighlight: 'none',
        padding: { top: 20 }, wordWrap: 'off', contextmenu: false, links: false,
        ariaLabel: `${diff ? 'Read-only unified diff' : 'Read-only historical file'} ${path}`,
      });
    }).catch(() => { if (!disposed) setFallback(true); });
    return () => { disposed = true; instance?.dispose(); model?.dispose(); };
  }, [content, path, diff]);
  return fallback ? <pre className="code-fallback" tabIndex={0} aria-label={`Historical file ${path}`}>{content}</pre> : <div className="code-viewer" ref={host} />;
}
