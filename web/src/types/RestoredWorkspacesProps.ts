export interface RestoredWorkspacesProps {
  revision: number;
  onCheckpoints: () => void;
  onInspect: (checkpoint: string) => Promise<void>;
}
