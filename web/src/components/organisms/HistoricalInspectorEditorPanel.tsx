import type { Change, Checkpoint, FileContent } from '../../types';
import { CodeViewer } from './CodeViewer';
import { ComparisonViewer } from './ComparisonViewer';

export function HistoricalInspectorEditorPanel({
  model: viewModel,
}: {
  model: {
    path: string;
    mode: 'file' | 'diff';
    total: number;
    checkpoint: Checkpoint | null;
    id: string;
    diffError: string;
    setRetry: import('react').Dispatch<import('react').SetStateAction<number>>;
    fileLoading: boolean;
    fileError: string;
    changes: Change[];
    value: { key: string; before: FileContent | null; after: FileContent | null } | null;
    change: Change | undefined;
    split: boolean;
  };
}) {
  const {
    path,
    mode,
    total,
    checkpoint,
    id,
    diffError,
    setRetry,
    fileLoading,
    fileError,
    changes,
    value,
    change,
    split,
  } = viewModel;
  return (
    <section className="editor-panel" aria-label="Historical file contents">
      <div className="file-heading">
        <span>{path || 'Select a file'}</span>
        <span className="readonly-label">READ ONLY</span>
      </div>
      {mode === 'diff' && (
        <div className="diff-heading">
          <strong>{total} changed paths</strong>
          <span>
            {checkpoint?.parent_id
              ? 'Parent ' + checkpoint.parent_id.slice(0, 8) + ' → ' + id.slice(0, 8)
              : 'Baseline compared with empty tree'}
          </span>
        </div>
      )}
      {diffError && mode === 'diff' && (
        <div role="alert" className="error-box">
          {diffError}
          <button onClick={() => setRetry((value) => value + 1)}>Retry diff</button>
        </div>
      )}
      {fileLoading ? (
        <div className="inspection-empty" role="status">
          Loading historical file…
        </div>
      ) : fileError ? (
        <div className="panel-padding">
          <div role="alert" className="error-box">
            {fileError}
          </div>
          <button onClick={() => setRetry((value) => value + 1)}>Retry file</button>
        </div>
      ) : !path ? (
        <div className="inspection-empty">
          <h2>Select a file</h2>
          <p>
            {mode === 'diff' && !changes.length
              ? 'No file changes in this captured comparison.'
              : 'Choose a captured file from the list.'}
          </p>
        </div>
      ) : mode === 'file' ? (
        value?.after ? (
          <CodeViewer content={value.after.content} path={path} stateKey={id + ':' + path} />
        ) : (
          <div className="inspection-empty">
            This file was not captured in the selected checkpoint. Review its omissions.
          </div>
        )
      ) : change?.binary ? (
        <div className="inspection-empty">Binary file changed; contents are not displayed.</div>
      ) : change?.truncated ? (
        <div className="inspection-empty">
          Patch omitted because it exceeds the display limit. Select Files to inspect eligible
          individual captures.
        </div>
      ) : value ? (
        <>
          <div className="comparison-labels">
            <span>{value.before ? 'Parent checkpoint' : 'Not captured in parent'}</span>
            <span>
              {value.after ? 'Selected checkpoint' : 'Not captured in selected checkpoint'}
            </span>
          </div>
          <ComparisonViewer
            before={value.before?.content || ''}
            after={value.after?.content || ''}
            path={path}
            split={split}
            stateKey={id + ':' + path + ':comparison'}
          />
        </>
      ) : (
        <div className="inspection-empty" role="status">
          Preparing captured comparison…
        </div>
      )}
    </section>
  );
}
