import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  deleteCollection,
  listCollections,
  updateCollection,
} from '../repo';
import { allTags, searchPrompts } from '../search';
import type { Collection, Prompt } from '../types';
import { CollectionDialog } from './CollectionDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

interface Props {
  uncategorized?: boolean;
}

export function PromptListPage({ uncategorized }: Props = {}) {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingCollection, setEditingCollection] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const collections = useLiveQuery<Collection[], Collection[]>(
    () => listCollections(),
    [],
    [],
  );
  const collection = collections.find((c) => c.id === collectionId);

  const prompts = useLiveQuery<Prompt[], Prompt[]>(
    async () => {
      if (uncategorized) {
        const all = await db.prompts.orderBy('updated_at').reverse().toArray();
        return all.filter((p) => p.collection_id === null);
      }
      if (collectionId) {
        const all = await db.prompts.where('collection_id').equals(collectionId).toArray();
        return all.sort((a, b) => b.updated_at - a.updated_at);
      }
      return db.prompts.orderBy('updated_at').reverse().toArray();
    },
    [collectionId, uncategorized],
    [],
  );

  const tagOptions = useMemo(() => allTags(prompts), [prompts]);
  const filtered = useMemo(
    () => searchPrompts(prompts, { query, tags: selectedTags }),
    [prompts, query, selectedTags],
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const heading = uncategorized
    ? 'Uncategorized'
    : collection
      ? collection.name
      : 'All prompts';

  const subtitle = uncategorized
    ? 'Prompts not assigned to any collection.'
    : collection?.description || null;

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl text-text-primary">{heading}</h1>
          {subtitle && (
            <p className="text-sm text-text-muted mt-1.5 max-w-2xl">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-2">
          {collection && (
            <>
              <button onClick={() => setEditingCollection(true)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} className="btn-danger-ghost">
                Delete
              </button>
            </>
          )}
          <Link to="/prompts/new" className="btn-primary">New prompt</Link>
        </div>
      </header>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true">
            <SearchIcon />
          </span>
          <label htmlFor="search" className="sr-only">Search prompts</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, body, or tag…"
            className="input pl-9"
          />
        </div>
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
            {tagOptions.map(({ tag, count }) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                  className={active ? 'chip-active cursor-pointer' : 'chip-interactive'}
                >
                  <span>{tag}</span>
                  <span className="text-text-muted">{count}</span>
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <button onClick={() => setSelectedTags([])} className="chip-interactive">
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          hasQuery={query.length > 0 || selectedTags.length > 0}
          onClear={() => {
            setQuery('');
            setSelectedTags([]);
          }}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <PromptCard prompt={p} collections={collections} />
            </li>
          ))}
        </ul>
      )}

      {editingCollection && collection && (
        <CollectionDialog
          mode="edit"
          initial={{ name: collection.name, description: collection.description }}
          onClose={() => setEditingCollection(false)}
          onSubmit={async ({ name, description }) => {
            await updateCollection(collection.id, name, description);
            toast.show('Collection updated', { tone: 'success' });
            setEditingCollection(false);
          }}
        />
      )}
      {confirmDelete && collection && (
        <ConfirmDialog
          title={`Delete "${collection.name}"?`}
          message="Prompts in this collection will become uncategorized — they will not be deleted."
          confirmLabel="Delete collection"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteCollection(collection.id);
            toast.show(`Deleted collection “${collection.name}”`);
            setConfirmDelete(false);
            navigate('/prompts');
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ hasQuery, onClear }: { hasQuery: boolean; onClear: () => void }) {
  return (
    <div className="card card-detail text-center">
      <p className="text-sm text-text-muted mb-4">
        {hasQuery ? 'No prompts match your search or tag filters.' : 'No prompts here yet.'}
      </p>
      {hasQuery ? (
        <button onClick={onClear} className="btn-secondary">Clear filters</button>
      ) : (
        <Link to="/prompts/new" className="btn-primary">Create your first prompt</Link>
      )}
    </div>
  );
}

function PromptCard({ prompt, collections }: { prompt: Prompt; collections: Collection[] }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const collection = collections.find((c) => c.id === prompt.collection_id);
  const preview = prompt.body.length > 220 ? prompt.body.slice(0, 220) + '…' : prompt.body;

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
    <article className="card-interactive card-compact relative h-full group">
      {/* Stretched link covers the card surface; siblings with z>0 stay interactive. */}
      <Link
        to={`/prompts/${prompt.id}`}
        aria-label={`Open prompt: ${prompt.title}`}
        className="absolute inset-0 rounded-lg z-10"
      />
      <div className="relative z-20 flex items-start justify-between gap-2 mb-1.5 pointer-events-none">
        <h3 className="text-md text-text-primary truncate">{prompt.title}</h3>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy prompt body'}
          title="Copy prompt body"
          className={`pointer-events-auto shrink-0 inline-flex items-center justify-center
                      h-7 w-7 rounded-md transition-all duration-fast ease-out
                      ${copied
                        ? 'text-success bg-success/10'
                        : 'text-text-muted opacity-60 hover:opacity-100 hover:text-text-primary hover:bg-elevated group-hover:opacity-100'}
                      focus-visible:opacity-100`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <p className="text-sm text-text-secondary line-clamp-3 whitespace-pre-wrap">{preview}</p>
      {(collection || prompt.tags.length > 0) && (
        <div className="relative z-0 mt-3 flex flex-wrap gap-1">
          {collection && <span className="chip">{collection.name}</span>}
          {prompt.tags.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}
      <div className="relative z-0 mt-3 text-xs text-text-muted">{formatRelative(prompt.updated_at)}</div>
    </article>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
