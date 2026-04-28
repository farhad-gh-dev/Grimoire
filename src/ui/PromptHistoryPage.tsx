import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { listVersions, revertToVersion } from '../repo';
import type { Prompt, PromptVersion } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

export function PromptHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const prompt = useLiveQuery<Prompt | undefined>(() => (id ? db.prompts.get(id) : undefined), [id]);
  const versions = useLiveQuery<PromptVersion[], PromptVersion[]>(
    () => (id ? listVersions(id) : Promise.resolve([])),
    [id],
    [],
  );
  const [selected, setSelected] = useState<PromptVersion | null>(null);
  const [confirmRevert, setConfirmRevert] = useState<PromptVersion | null>(null);

  if (!prompt) {
    return <div className="text-sm text-text-muted">Loading…</div>;
  }

  return (
    <div>
      <nav className="text-xs text-text-muted mb-3" aria-label="Breadcrumb">
        <Link to="/prompts" className="hover:text-text-secondary transition-colors">Prompts</Link>
        <span className="mx-1.5">/</span>
        <Link to={`/prompts/${prompt.id}`} className="hover:text-text-secondary transition-colors">{prompt.title}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-secondary">History</span>
      </nav>
      <h1 className="text-xl text-text-primary mb-6">Version history</h1>

      {versions.length === 0 ? (
        <div className="card card-detail text-center text-sm text-text-muted">
          No prior versions yet. A snapshot is captured each time you save edits.
        </div>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          <ul className="card divide-y divide-border-subtle max-h-[70vh] overflow-y-auto" role="list">
            {versions.map((v) => {
              const active = selected?.id === v.id;
              return (
                <li key={v.id}>
                  <button
                    onClick={() => setSelected(v)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      active ? 'bg-elevated text-text-primary' : 'text-text-secondary hover:bg-elevated'
                    }`}
                    aria-current={active ? 'true' : undefined}
                  >
                    <div className="font-medium truncate">{v.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {new Date(v.version_created_at).toLocaleString()}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div>
            {selected ? (
              <article>
                <header className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-md text-text-primary">{selected.title}</h2>
                    <p className="text-xs text-text-muted mt-1">
                      Saved {new Date(selected.version_created_at).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => setConfirmRevert(selected)} className="btn-secondary">
                    Revert to this version
                  </button>
                </header>
                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selected.tags.map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>
                )}
                <pre className="card card-padded prose-mono">{selected.body}</pre>
              </article>
            ) : (
              <div className="card card-detail text-center text-sm text-text-muted">
                Select a version to view its contents.
              </div>
            )}
          </div>
        </div>
      )}

      {confirmRevert && (
        <ConfirmDialog
          title="Revert to this version?"
          message="The current content will be saved as a new history entry first, so this is reversible."
          confirmLabel="Revert"
          onCancel={() => setConfirmRevert(null)}
          onConfirm={async () => {
            await revertToVersion(prompt.id, confirmRevert.id);
            setConfirmRevert(null);
            toast.show('Reverted to selected version', { tone: 'success' });
            navigate(`/prompts/${prompt.id}`);
          }}
        />
      )}
    </div>
  );
}
