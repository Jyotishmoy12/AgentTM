import { ProjectIcon } from '../atoms/ProjectIcon';

export function ProjectMenuProjectCurrent({
  model: viewModel,
}: {
  model: {
    project: string;
    loading: boolean;
    path: string;
    copy: () => Promise<void>;
    action: '' | 'copy' | 'choose';
    pathError: string;
    setRetry: import('react').Dispatch<import('react').SetStateAction<number>>;
  };
}) {
  const { project, loading, path, copy, action, pathError, setRetry } = viewModel;
  return (
    <section className="project-current" aria-label="Current project">
      <div className="project-current-identity">
        <ProjectIcon kind="folder" />
        <div>
          <h3>{project}</h3>
          <p id="project-dialog-description">The project open in this window.</p>
        </div>
      </div>
      {loading && (
        <p className="project-path-status" role="status">
          Reading project location...
        </p>
      )}
      {path && (
        <div className="project-location">
          <code>{path}</code>
          <button
            onClick={copy}
            disabled={!!action}
            aria-label="Copy project path"
            title="Copy project path"
          >
            <ProjectIcon kind="copy" />
          </button>
        </div>
      )}
      {pathError && (
        <div className="project-path-error" role="alert">
          <p>{pathError}</p>
          <button onClick={() => setRetry((value) => value + 1)}>Retry project path</button>
        </div>
      )}
      {!loading && !pathError && !path && (
        <p className="project-path-status">
          The project location is available in the native desktop app.
        </p>
      )}
    </section>
  );
}
