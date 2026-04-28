import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { deletePrompt, listCollections } from '../repo';
import type { Prompt } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { downloadText, promptToMarkdown, safeFilename } from '../io';
import { useToast } from './Toast';

export function PromptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = useLiveQuery<Prompt | undefined>(() => (id ? db.prompts.get(id) : undefined), [id]);
  const collections = useLiveQuery<Awaited<ReturnType<typeof listCollections>>, Awaited<ReturnType<typeof listCollections>>>(
    () => listCollections(),
    [],
    [],
  );
  const collection = collections.find((c) => c.id === prompt?.collection_id);

  if (prompt === undefined) {
    return <div className="text-sm text-text-muted">Loading…</div>;
  }
  if (!prompt) {
    return (
      <div className="card card-detail text-center">
        <p className="text-sm text-text-secondary mb-4">This prompt no longer exists.</p>
        <Link to="/prompts" className="btn-secondary">Back to library</Link>
      </div>
    );
  }

  async function copyBody() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.body);
      setCopied(true);
      toast.show('Copied to clipboard', { tone: 'success' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.show('Could not copy — clipboard unavailable', { tone: 'danger' });
    }
  }

  return (
    <article>
      <nav className="text-xs text-text-muted mb-3" aria-label="Breadcrumb">
        <Link to="/prompts" className="hover:text-text-secondary transition-colors">Prompts</Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-secondary">{prompt.title}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl text-text-primary">{prompt.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted">
            {collection && <span className="chip">{collection.name}</span>}
            <span>Updated {new Date(prompt.updated_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copyBody} className="btn-secondary" aria-live="polite">
            {copied ? 'Copied' : 'Copy body'}
          </button>
          <button
            onClick={() => downloadText(`${safeFilename(prompt.title)}.md`, promptToMarkdown(prompt), 'text/markdown')}
            className="btn-secondary"
          >
            Export .md
          </button>
          <Link to={`/prompts/${prompt.id}/history`} className="btn-secondary">History</Link>
          <Link to={`/prompts/${prompt.id}/edit`} className="btn-primary">Edit</Link>
          <button onClick={() => setConfirmingDelete(true)} className="btn-danger-ghost">
            Delete
          </button>
        </div>
      </header>

      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {prompt.tags.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}

      <pre className="card card-padded prose-mono">{prompt.body}</pre>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this prompt?"
          message="This cannot be undone. The prompt and all of its version history will be removed."
          confirmLabel="Delete"
          destructive
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await deletePrompt(prompt.id);
            toast.show('Prompt deleted');
            navigate('/prompts');
          }}
        />
      )}
    </article>
  );
}
