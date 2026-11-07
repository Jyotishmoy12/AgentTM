import type * as Monaco from 'monaco-editor/editor';
import { memo, useEffect, useRef, useState } from 'react';
import { positions } from '../../data/ComparisonViewer';
import { language } from '../../utils/language';
import { loadMonaco } from '../../utils/loadMonaco';

export const ComparisonViewer = memo(function ComparisonViewer({
  before,
  after,
  path,
  split,
  stateKey,
}: {
  before: string;
  after: string;
  path: string;
  split: boolean;
  stateKey: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null);
  const [failed, setFailed] = useState(false);
  const mode = useRef(split);
  mode.current = split;
  useEffect(() => {
    let disposed = false;
    let original: Monaco.editor.ITextModel | undefined;
    let modified: Monaco.editor.ITextModel | undefined;
    setFailed(false);
    loadMonaco()
      .then((monaco) => {
        if (disposed || !host.current) return;
        monaco.editor.defineTheme('agenttm-diff', {
          base: 'vs-dark',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': '#191a1f',
            'editorGutter.background': '#191a1f',
            'editorLineNumber.foreground': '#687180',
            'diffEditor.insertedTextBackground': '#648b3333',
            'diffEditor.removedTextBackground': '#bb435333',
          },
        });
        original = monaco.editor.createModel(before, language(path));
        modified = monaco.editor.createModel(after, language(path));
        const instance = monaco.editor.createDiffEditor(host.current, {
          theme: 'agenttm-diff',
          readOnly: true,
          originalEditable: false,
          domReadOnly: true,
          automaticLayout: true,
          renderSideBySide: mode.current,
          useInlineViewWhenSpaceIsLimited: false,
          ignoreTrimWhitespace: false,
          maxComputationTime: 1500,
          minimap: { enabled: false },
          fontFamily: 'Cascadia Code, Consolas, monospace',
          fontSize: 13,
          lineHeight: 22,
          scrollBeyondLastLine: false,
          contextmenu: false,
          links: false,
          renderOverviewRuler: false,
          ariaLabel: 'Read-only checkpoint comparison ' + path,
        });
        editor.current = instance;
        instance.setModel({ original, modified });
        const position = positions.get(stateKey);
        if (position) instance.restoreViewState(position);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      const instance = editor.current;
      const position = instance?.saveViewState();
      if (position) {
        if (positions.size > 100) positions.delete(positions.keys().next().value!);
        positions.set(stateKey, position);
      }
      instance?.dispose();
      editor.current = null;
      original?.dispose();
      modified?.dispose();
    };
  }, [before, after, path, stateKey]);
  useEffect(() => {
    editor.current?.updateOptions({ renderSideBySide: split });
  }, [split]);
  return failed ? (
    <div className="comparison-fallback">
      <p>Syntax comparison could not load. Captured text is shown below.</p>
      <h3>Parent checkpoint</h3>
      <pre>{before}</pre>
      <h3>Selected checkpoint</h3>
      <pre>{after}</pre>
    </div>
  ) : (
    <div className="comparison-editor" ref={host} />
  );
});
