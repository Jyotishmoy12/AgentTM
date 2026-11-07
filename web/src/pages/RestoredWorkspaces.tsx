import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { message } from '../api';
import { RestoredWorkspacesRestoreManager } from '../components/organisms/RestoredWorkspacesRestoreManager';
import { identity, resultLabel } from '../data/RestoredWorkspaces';
import { copyText, desktopBridge } from '../handlers/native';
import { listRestoredWorkspaces, moreRestoredWorkspaces } from '../handlers/restores';
import type { RestoredWorkspace } from '../types';
import type { FolderState, RestoreBridge } from '../types/RestoredWorkspaces';
import type { RestoredWorkspacesProps } from '../types/RestoredWorkspacesProps';

export function RestoredWorkspaces({
  revision,
  onCheckpoints,
  onInspect,
}: RestoredWorkspacesProps) {
  const [items, setItems] = useState<RestoredWorkspace[]>([]),
    [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true),
    [moreBusy, setMoreBusy] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(''),
    [sort, setSort] = useState('newest'),
    [selected, setSelected] = useState('');
  const [drawer, setDrawer] = useState(false),
    [narrow, setNarrow] = useState(() => matchMedia('(max-width:1100px)').matches);
  const [folder, setFolder] = useState<FolderState | null>(null),
    [checking, setChecking] = useState(false),
    [action, setAction] = useState(''),
    [feedback, setFeedback] = useState(''),
    [actionError, setActionError] = useState('');
  const generation = useRef(0),
    selection = useRef(selected),
    rows = useRef<HTMLDivElement>(null);
  selection.current = selected;
  const bridge = desktopBridge() as RestoreBridge | undefined;
  useEffect(() => {
    const media = matchMedia('(max-width:1100px)');
    const update = () => {
      setNarrow(media.matches);
      setDrawer(false);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const run = ++generation.current;
    setLoading(true);
    setMoreBusy(false);
    setError('');
    listRestoredWorkspaces(controller.signal)
      .then((page) => {
        if (!controller.signal.aborted && generation.current === run) {
          setItems(page.items);
          setCursor(page.next_cursor);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, retry]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items
      .filter((item) =>
        [
          identity(item),
          item.branch_name,
          item.worktree_path,
          item.checkpoint_id,
          resultLabel(item.status),
        ].some((text) => text.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        if (sort === 'name') return identity(a).localeCompare(identity(b));
        if (sort === 'result')
          return (
            resultLabel(a.status).localeCompare(resultLabel(b.status)) || a.id.localeCompare(b.id)
          );
        return (
          ((Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0)) *
            (sort === 'oldest' ? 1 : -1) || a.id.localeCompare(b.id)
        );
      });
  }, [items, search, sort]);
  useEffect(() => {
    if (!visible.some((item) => item.id === selected)) setSelected(visible[0]?.id || '');
  }, [visible, selected]);
  const item = visible.find((value) => value.id === selected);
  useLayoutEffect(() => {
    setFolder(null);
    setFeedback('');
    setActionError('');
    setChecking(false);
    setAction('');
  }, [selected]);
  async function checkFolder() {
    if (!item || !bridge?.CheckRestoredWorkspace) return;
    const id = item.id;
    setChecking(true);
    setActionError('');
    try {
      const result = await bridge.CheckRestoredWorkspace(id);
      if (selection.current === id) setFolder(result);
    } catch (e) {
      if (selection.current === id) setActionError(message(e));
    } finally {
      if (selection.current === id) setChecking(false);
    }
  }
  async function perform(kind: 'copy' | 'open' | 'inspect') {
    if (!item || action) return;
    const id = item.id;
    setAction(kind);
    setFeedback('');
    setActionError('');
    try {
      if (kind === 'copy') {
        if (bridge?.CopyText) await bridge.CopyText(item.worktree_path);
        else await copyText(item.worktree_path);
        if (selection.current === id) setFeedback('Workspace path copied.');
      }
      if (kind === 'inspect') await onInspect(item.checkpoint_id);
      if (kind === 'open' && bridge?.OpenRestoredWorkspace) {
        await bridge.OpenRestoredWorkspace(id);
        if (selection.current === id) setFeedback('File Explorer launch requested.');
      }
    } catch (e) {
      if (selection.current === id) setActionError(message(e));
    } finally {
      if (selection.current === id) setAction('');
    }
  }
  async function more() {
    if (cursor === null || moreBusy) return;
    const run = generation.current;
    setMoreBusy(true);
    setError('');
    try {
      const page = await moreRestoredWorkspaces(cursor);
      if (generation.current === run) {
        setItems((old) => [
          ...old,
          ...page.items.filter((item) => !old.some((value) => value.id === item.id)),
        ]);
        setCursor(page.next_cursor);
      }
    } catch (e) {
      if (generation.current === run) setError(message(e));
    } finally {
      if (generation.current === run) setMoreBusy(false);
    }
  }
  function close() {
    setDrawer(false);
    requestAnimationFrame(() =>
      rows.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus(),
    );
  }
  return (
    <RestoredWorkspacesRestoreManager
      model={{
        narrow,
        drawer,
        close,
        onCheckpoints,
        search,
        setSearch,
        sort,
        setSort,
        error,
        loading,
        setRetry,
        items,
        visible,
        rows,
        selected,
        setSelected,
        setDrawer,
        cursor,
        moreBusy,
        more,
        item,
        action,
        perform,
        bridge,
        folder,
        feedback,
        actionError,
        checking,
        checkFolder,
      }}
    />
  );
}
