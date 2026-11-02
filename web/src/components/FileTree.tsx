import type { SnapshotFile } from '../types';

interface Folder { folders: Map<string, Folder>; files: SnapshotFile[] }
export function FileTree({ files, selected, onSelect }: { files: SnapshotFile[]; selected: string; onSelect: (path: string) => void }) {
  const root: Folder = { folders: new Map(), files: [] };
  for (const file of files) {
    let current = root;
    const parts = file.path.split('/');
    for (const part of parts.slice(0, -1)) {
      if (!current.folders.has(part)) current.folders.set(part, { folders: new Map(), files: [] });
      current = current.folders.get(part)!;
    }
    current.files.push(file);
  }
  function contents(folder: Folder, depth: number): React.ReactNode {
    return <>{[...folder.folders].sort(([a], [b]) => a.localeCompare(b)).map(([name, child]) => <details className="tree-folder" open key={name}><summary style={{ paddingLeft: depth * 10 + 6 }} title={name}>{name}</summary>{contents(child, depth + 1)}</details>)}{folder.files.map(file => <button key={file.path} onClick={() => onSelect(file.path)} className={selected === file.path ? 'active-file' : ''} style={{ paddingLeft: depth * 10 + 6 }} aria-current={selected === file.path ? 'true' : undefined} title={file.path}><span className="file-icon" aria-hidden="true">▤</span><span>{file.path.split('/').at(-1)}</span></button>)}</>;
  }
  return contents(root, 0);
}
