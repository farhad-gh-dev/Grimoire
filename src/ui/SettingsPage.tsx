import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { exportAll, downloadJson, importFromText, type ImportResult } from '../io';
import { wipeAll } from '../repo';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { formatBytes, getStorageEstimate, type StorageEstimate } from '../storage';

export function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReplace, setConfirmReplace] = useState<File | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);

  const promptCount = useLiveQuery<number, number>(() => db.prompts.count(), [], 0);
  const collectionCount = useLiveQuery<number, number>(() => db.collections.count(), [], 0);
  const versionCount = useLiveQuery<number, number>(() => db.versions.count(), [], 0);

  useEffect(() => {
    let cancelled = false;
    getStorageEstimate().then((e) => {
      if (!cancelled) setEstimate(e);
    });
    return () => {
      cancelled = true;
    };
  }, [promptCount, versionCount, result]);

  async function handleExport() {
    const data = await exportAll();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadJson(`grimoire-export-${stamp}.json`, data);
    toast.show(`Exported ${data.prompts.length} prompts`, { tone: 'success' });
  }

  async function runImport(file: File) {
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const r = await importFromText(text, importMode);
      setResult(r);
      const total = r.promptsAdded + r.collectionsAdded + r.versionsAdded;
      toast.show(`Imported ${total} record${total === 1 ? '' : 's'}`, { tone: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      setError(msg);
      toast.show(msg, { tone: 'danger' });
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (importMode === 'replace') setConfirmReplace(file);
    else void runImport(file);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-1.5">
          {promptCount} prompts · {collectionCount} collections · {versionCount} versions
        </p>
      </header>

      <section className="card card-padded">
        <h2 className="text-md text-text-primary mb-1">Storage</h2>
        <p className="text-sm text-text-muted mb-4">
          IndexedDB usage in this browser. Browsers typically allow tens to hundreds of MB before warning.
        </p>
        {estimate ? (
          <StorageBar estimate={estimate} />
        ) : (
          <p className="text-sm text-text-muted">Storage estimate unavailable in this browser.</p>
        )}
      </section>

      <section className="card card-padded">
        <h2 className="text-md text-text-primary mb-1">Export</h2>
        <p className="text-sm text-text-muted mb-4">
          Download all prompts, collections, and version history as a single JSON file.
        </p>
        <button onClick={handleExport} className="btn-primary">Export library</button>
      </section>

      <section className="card card-padded">
        <h2 className="text-md text-text-primary mb-1">Import</h2>
        <p className="text-sm text-text-muted mb-4">Load a previously exported JSON file.</p>
        <fieldset className="mb-4">
          <legend className="field-label">Mode</legend>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="accent-accent-500"
              />
              <span>Merge — skip duplicate IDs</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="accent-accent-500"
              />
              <span>Replace — wipe local store first</span>
            </label>
          </div>
        </fieldset>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFileChosen}
        />
        <button onClick={() => fileRef.current?.click()} className="btn-secondary">
          Choose file…
        </button>
        {result && (
          <p role="status" className="mt-4 text-sm text-success">
            Imported {result.promptsAdded} prompts, {result.collectionsAdded} collections, {result.versionsAdded} versions.
            {(result.promptsSkipped > 0 || result.collectionsSkipped > 0) &&
              ` Skipped ${result.promptsSkipped + result.collectionsSkipped} duplicate IDs.`}
          </p>
        )}
        {error && <p role="alert" className="field-error">{error}</p>}
      </section>

      <section className="card card-padded">
        <h2 className="text-md text-text-primary mb-1">Danger zone</h2>
        <p className="text-sm text-text-muted mb-4">
          Permanently delete every prompt, collection, and version stored in this browser.
        </p>
        <button onClick={() => setConfirmWipe(true)} className="btn-danger">Wipe local data</button>
      </section>

      <section className="card card-padded">
        <h2 className="text-md text-text-primary mb-1">About</h2>
        <p className="text-sm text-text-muted">
          Grimoire stores everything locally in your browser via IndexedDB. No account, no telemetry.
          See the README for self-hosting and the open-source license (MIT).
        </p>
      </section>

      {confirmReplace && (
        <ConfirmDialog
          title="Replace all local data?"
          message="Every existing prompt, collection, and version will be deleted before the import runs. This cannot be undone."
          confirmLabel="Replace"
          destructive
          onCancel={() => setConfirmReplace(null)}
          onConfirm={async () => {
            const file = confirmReplace;
            setConfirmReplace(null);
            await runImport(file);
          }}
        />
      )}

      {confirmWipe && (
        <ConfirmDialog
          title="Wipe all local data?"
          message="Every prompt, collection, and version will be permanently deleted. Export your library first if you want a backup."
          confirmLabel="Wipe everything"
          destructive
          onCancel={() => setConfirmWipe(false)}
          onConfirm={async () => {
            await wipeAll();
            setConfirmWipe(false);
            setResult(null);
            toast.show('Local library wiped', { tone: 'danger' });
          }}
        />
      )}
    </div>
  );
}

function StorageBar({ estimate }: { estimate: StorageEstimate }) {
  const { usage, quota, percent } = estimate;
  const pctLabel = percent < 0.1 ? '< 0.1%' : `${percent.toFixed(1)}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-2">
        <span className="text-text-secondary">
          {formatBytes(usage)}
          {quota > 0 && <span className="text-text-muted"> of {formatBytes(quota)}</span>}
        </span>
        {quota > 0 && <span className="text-xs text-text-muted">{pctLabel}</span>}
      </div>
      {quota > 0 ? (
        <div
          className="h-1.5 rounded-full bg-elevated overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-label="Storage used"
        >
          <div
            className="h-full bg-accent-500 transition-all duration-slow ease-out"
            style={{ width: `${Math.max(0.5, percent)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
