export function OnboardingContent3({
  model: viewModel,
}: {
  model: {
    command: (text: string) => import('react/jsx-runtime').JSX.Element;
  };
}) {
  const { command } = viewModel;
  return (
    <>
      <p>AgentTM observes files; it does not prove which agent action authored each line.</p>
      <h2>What is captured</h2>
      <p>
        Baseline and final workspace observations, plus supported manual and optional tool-boundary
        captures. When enabled, boundary observations describe before/after workspace states around
        received tool notifications.
      </p>
      <h2>Observation limits</h2>
      <ul>
        <li>
          Scans are not atomic. Other programs or overlapping operations can change files while a
          scan runs.
        </li>
        <li>An event without a linked checkpoint does not establish a new file state.</li>
        <li>
          Exact causal line attribution and deterministic replay of AI reasoning are not provided.
        </li>
      </ul>
      <h2>Partial captures</h2>
      <p>
        Excluded paths, Git-ignored files, configured size limits, unsupported file types, or scan
        consistency issues can limit a capture. The inspector lists recorded omissions; missing
        files must not be treated as captured.
      </p>
      <h2>Prompt privacy</h2>
      <p>
        Prompt text capture is off by default. Sanitized prompt capture is a project configuration
        option; redaction is best-effort and historical file contents are not secret-redacted.
      </p>
      <h2>Keep your first test small</h2>
      {command('agenttm run codex -- "Explain this project"')}
      <p>
        Only tasks launched through AgentTM are recorded. Codex uses its configured service; the
        entire workflow is not offline.
      </p>
    </>
  );
}
