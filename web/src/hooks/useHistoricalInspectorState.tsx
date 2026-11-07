import { useRef, useState } from 'react';
import type { Change, Checkpoint, FileContent, SnapshotFile } from '../types';

export function useHistoricalInspectorState({ model: viewModel }: { model: { id: string } }) {
  const { id } = viewModel;
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [files, setFiles] = useState<SnapshotFile[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [diffCursor, setDiffCursor] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [path, setPath] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [diffError, setDiffError] = useState('');
  const [content, setContent] = useState<{
    key: string;
    before: FileContent | null;
    after: FileContent | null;
  } | null>(null);
  const remembered = useRef(new Map<string, string>());
  const scrollPositions = useRef({ file: 0, diff: 0 });
  const tree = useRef<HTMLDivElement>(null);
  const activeID = useRef(id);
  activeID.current = id;
  return {
    checkpoint,
    setCheckpoint,
    files,
    setFiles,
    cursor,
    setCursor,
    changes,
    setChanges,
    diffCursor,
    setDiffCursor,
    total,
    setTotal,
    path,
    setPath,
    search,
    setSearch,
    error,
    setError,
    fileError,
    setFileError,
    retry,
    setRetry,
    loading,
    setLoading,
    fileLoading,
    setFileLoading,
    diffError,
    setDiffError,
    content,
    setContent,
    remembered,
    scrollPositions,
    tree,
    activeID,
  };
}
