import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from '../api';
import { CleanupFlow } from '../components/organisms/CleanupFlow';
import { SecretFlow } from '../components/organisms/SecretFlow';
import { StorageStorageEditorialContent } from '../components/organisms/StorageStorageEditorialContent';
import { storageSize } from '../data/StorageManager';
import type { GCReport, StorageUsage } from '../desktop';
import { desktopFeatures } from '../desktop';
import { plural } from '../history-presentation';
import type { Flow } from '../types/StorageManager';

export function StoragePage() {
  const bridge = desktopFeatures();
  const [flow, setFlow] = useState<Flow | null>(null),
    [busy, setBusy] = useState('');
  const [usage, setUsage] = useState<StorageUsage | null>(null),
    [measuring, setMeasuring] = useState(false),
    [usageError, setUsageError] = useState('');
  const [report, setReport] = useState<GCReport | null>(null),
    [cleanupError, setCleanupError] = useState(''),
    [attempted, setAttempted] = useState(false);
  const [outcome, setOutcome] = useState<{
    kind: Flow;
    message: string;
    path?: string;
  } | null>(null);
  const active = useRef(true),
    measureRun = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      measureRun.current++;
    };
  }, []);
  const measure = useCallback(async () => {
    if (!bridge?.StorageUsage) return;
    const run = ++measureRun.current;
    setMeasuring(true);
    setUsageError('');
    try {
      const value = await bridge.StorageUsage();
      const parts = [value.blobs, value.database, value.manifests, value.logs, value.other];
      if (
        !Number.isFinite(Date.parse(value.measured_at)) ||
        parts.some((part) => !Number.isFinite(part) || part < 0) ||
        parts.reduce((a, b) => a + b, 0) !== value.total
      )
        throw new Error('Storage measurement was incomplete. Refresh to try again.');
      if (active.current && run === measureRun.current) setUsage(value);
    } catch (e) {
      if (active.current && run === measureRun.current) {
        setUsage(null);
        setUsageError(message(e));
      }
    } finally {
      if (active.current && run === measureRun.current) setMeasuring(false);
    }
  }, [bridge]);
  useEffect(() => {
    void measure();
  }, [measure]);
  function close() {
    if (busy) return;
    setFlow(null);
    setReport(null);
    setCleanupError('');
  }
  async function run(kind: 'backup' | 'restore', password: string) {
    if (!bridge || busy) return;
    setBusy(kind);
    setOutcome(null);
    try {
      const path = await (kind === 'backup'
        ? bridge.CreateBackup(password)
        : bridge.RestoreHistory(password));
      if (active.current) {
        setOutcome({
          kind,
          message: path
            ? kind === 'backup'
              ? 'Encrypted backup saved.'
              : 'History restored into the selected repository.'
            : kind === 'backup'
              ? 'Backup cancelled.'
              : 'Restore cancelled.',
          path: path || undefined,
        });
        setFlow(null);
        if (path) void measure();
      }
    } finally {
      if (active.current) setBusy('');
    }
  }
  async function preview() {
    if (!bridge || busy) return;
    setFlow('cleanup');
    setReport(null);
    setAttempted(false);
    setCleanupError('');
    setOutcome(null);
    setBusy('preview');
    try {
      const result = await bridge.GarbageCollect(false, '');
      if (active.current) setReport(result);
    } catch (e) {
      if (active.current) setCleanupError(message(e));
    } finally {
      if (active.current) setBusy('');
    }
  }
  async function apply() {
    if (!bridge || busy || !report?.candidates || !report.token) return;
    setBusy('apply');
    setCleanupError('');
    try {
      const result = await bridge.GarbageCollect(true, report.token);
      if (active.current) {
        setOutcome({
          kind: 'cleanup',
          message: `Removed ${result.removed} ${plural(result.removed, 'unreferenced blob')} (${storageSize(result.bytes)} of logical file data).`,
        });
        setFlow(null);
        setReport(null);
        void measure();
      }
    } catch (e) {
      if (active.current) {
        setAttempted(true);
        setCleanupError(message(e));
        setReport(null);
      }
    } finally {
      if (active.current) setBusy('');
    }
  }
  const categories = usage
    ? [
        { name: 'Blob storage', bytes: usage.blobs, key: 'blobs' },
        { name: 'SQLite & journals', bytes: usage.database, key: 'database' },
        {
          name: 'Checkpoint manifests',
          bytes: usage.manifests,
          key: 'manifests',
        },
        { name: 'Recorded logs', bytes: usage.logs, key: 'logs' },
        { name: 'Configuration & other', bytes: usage.other, key: 'other' },
      ]
    : [];
  return (
    <section className="storage-manager" aria-label="Storage and backups manager">
      <header className="storage-editorial-heading">
        <span className="editorial-kicker">HISTORY ON THIS DEVICE</span>
        <h1>Storage & backups</h1>
        <p>Keep your recorded history protected, portable, and tidy.</p>
      </header>
      <StorageStorageEditorialContent
        model={{
          bridge,
          measuring,
          busy,
          measure,
          usage,
          categories,
          usageError,
          setOutcome,
          setFlow,
          preview,
          outcome,
        }}
      />
      {(flow === 'backup' || flow === 'restore') && (
        <SecretFlow key={flow} kind={flow} busy={!!busy} run={run} close={close} />
      )}
      {flow === 'cleanup' && (
        <CleanupFlow
          report={report}
          busy={busy}
          error={cleanupError}
          attempted={attempted}
          preview={preview}
          apply={apply}
          close={close}
        />
      )}
    </section>
  );
}
