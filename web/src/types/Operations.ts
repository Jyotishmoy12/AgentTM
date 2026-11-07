export type Operation = {
  id: string;
  tool: string;
  status: string;
  capture_status: string;
  before_checkpoint_id: string;
  after_checkpoint_id: string;
  changed_paths: string[];
  changed_path_count: number;
  overlapping: boolean;
  missing_start: boolean;
  error: string;
  started_at: string;
};
