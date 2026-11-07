import type { Checkpoint } from '../../types';
import { PanelIcon } from '../atoms/PanelIcon';

export function WorkspaceWorkbenchToolbar({
  model: viewModel,
}: {
  model: {
    railOpen: boolean;
    setRailOpen: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    id: string;
    onCheckpoint: (id: string) => void;
    checkpoints: Checkpoint[];
    checkpointMore: boolean;
    loadCheckpoints: () => void;
    focus: boolean;
    setFocus: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    detailsToggle: import('react').RefObject<HTMLButtonElement | null>;
    showDetails: boolean;
    narrow: boolean;
    setDrawer: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    setDetailsOpen: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    canRestore: boolean;
    onRestore: (id: string) => void;
  };
}) {
  const {
    railOpen,
    setRailOpen,
    id,
    onCheckpoint,
    checkpoints,
    checkpointMore,
    loadCheckpoints,
    focus,
    setFocus,
    detailsToggle,
    showDetails,
    narrow,
    setDrawer,
    setDetailsOpen,
    canRestore,
    onRestore,
  } = viewModel;
  return (
    <div className="workbench-toolbar">
      <div className="workbench-left-actions">
        <button
          aria-label={railOpen ? 'Hide history panel' : 'Show history panel'}
          aria-expanded={railOpen}
          onClick={() => setRailOpen((value) => !value)}
        >
          <PanelIcon type="history" /> <span>History</span>
        </button>
        <select
          aria-label="Select checkpoint"
          value={id}
          onChange={(event) => onCheckpoint(event.target.value)}
        >
          <option value="" disabled>
            No known checkpoint
          </option>
          {id && !checkpoints.some((cp) => cp.id === id) && (
            <option value={id}>{id.slice(0, 8)}</option>
          )}
          {checkpoints.map((checkpoint) => (
            <option key={checkpoint.id} value={checkpoint.id}>
              {checkpoint.kind} · {checkpoint.id.slice(0, 8)}
              {checkpoint.partial ? ' · partial' : ''}
            </option>
          ))}
        </select>
        {checkpointMore && <button onClick={loadCheckpoints}>More</button>}
      </div>
      <div className="workbench-right-actions">
        <button
          aria-label={focus ? 'Exit full-width inspection' : 'Full-width inspection'}
          aria-pressed={focus}
          onClick={() => setFocus((value) => !value)}
        >
          <PanelIcon type="focus" /> <span>{focus ? 'Exit focus' : 'Focus'}</span>
        </button>
        <button
          ref={detailsToggle}
          aria-label={showDetails ? 'Hide details panel' : 'Show details panel'}
          aria-expanded={showDetails}
          onClick={() =>
            narrow ? setDrawer((value) => !value) : setDetailsOpen((value) => !value)
          }
        >
          <PanelIcon type="details" /> <span>Details</span>
        </button>
        <button
          className="primary-button"
          disabled={!id || !canRestore}
          onClick={() => onRestore(id)}
        >
          Restore checkpoint
        </button>
      </div>
    </div>
  );
}
