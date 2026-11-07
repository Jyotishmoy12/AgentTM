import type { Checkpoint, RecordedEvent } from '../types';
export interface WorkspaceProps {
  sessionID: string;
  events: RecordedEvent[];
  checkpoints: Checkpoint[];
  loading: boolean;
  selectedID: string;
  overrideCP: string;
  onSelect: (id: string) => void;
  onCheckpoint: (id: string) => void;
  canRestore: boolean;
  onRestore: (id: string) => void;
  checkpointMore: boolean;
  eventMore: boolean;
  loadingMore: boolean;
  loadEvents: () => void;
  loadCheckpoints: () => void;
  initialCheckpoints: boolean;
}
