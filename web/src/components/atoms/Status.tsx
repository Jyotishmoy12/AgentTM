export function Status({ state, label }: { state: string; label: string }) {
  return (
    <span className={'settings-status status-' + state}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
