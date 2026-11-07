import type { SnapshotFile } from '../types';

export interface Folder {
  folders: Map<string, Folder>;
  files: SnapshotFile[];
}
