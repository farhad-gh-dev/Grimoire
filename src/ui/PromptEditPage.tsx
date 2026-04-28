import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  createPrompt,
  listCollections,
  updatePrompt,
  ValidationError,
} from '../repo';
import { BODY_MAX, TITLE_MAX, type Collection, type Prompt } from '../types';
import { useToast } from './Toast';

interface Props {
  mode: 'create' | 'edit';
}

export function PromptEditPage({ mode }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const existing = useLiveQuery<Prompt | undefined>(
    () => (mode === 'edit' && id ? db.prompts.get(id) : undefined),
    [id, mode],
  );
  const collections = useLiveQuery<Collection[], Collection[]>(
    () => listCollections(),
    [],
    [],
  );

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [collectionId, setCollectionId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const hydrated = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'create') titleRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'edit') {
      hydrated.current = true;
      return;
    }
    if (existing && !hydrated.current) {
      setTitle(existing.title);
      setBody(existing.body);
      setTags(existing.tags);
      setCollectionId(existing.collection_id ?? '');
      hydrated.current = true;
    }
  }, [existing, mode]);

  function commitTagInput() {
    const raw = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (raw.length === 0) return;
    const next = [...tags];
    for (const t of raw) {
      if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    setTags(next);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    const finalTags = tagInput.trim()
      ? [...tags, ...tagInput.split(',').map((t) => t.trim()).filter(Boolean)]
      : tags;
    try {
      const input = {
        title,
        body,
        tags: finalTags,
        collection_id: collectionId || null,
      };
      if (mode === 'create') {
        const p = await createPrompt(input);
        toast.show('Prompt created', { tone: 'success' });
        navigate(`/prompts/${p.id}`);
      } else if (id) {
        const p = await updatePrompt(id, input);
        toast.show('Changes saved', { tone: 'success' });
        navigate(`/prompts/${p.id}`);
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors({ [err.field]: err.message });
      } else {
        setErrors({ _: err instanceof Error ? err.message : 'Could not save.' });
      }
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'edit' && existing === undefined) {
    return <div className="text-sm text-text-muted">Loading…</div>;
  }
  if (mode === 'edit' && !existing) {
    return (
      <div className="card card-detail text-center">
        <p className="text-sm text-text-secondary mb-4">This prompt no longer exists.</p>
        <Link to="/prompts" className="btn-secondary">Back to library</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <header className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl text-text-primary">
          {mode === 'create' ? 'New prompt' : 'Edit prompt'}
        </h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : mode === 'create' ? 'Create prompt' : 'Save changes'}
          </button>
        </div>
      </header>

      <div className="space-y-5">
        <div>
          <label htmlFor="title" className="field-label">Title</label>
          <input
            id="title"
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'err-title' : undefined}
            className={`input ${errors.title ? 'input-error' : ''}`}
            required
          />
          {errors.title && <p id="err-title" role="alert" className="field-error">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="body" className="field-label">Body</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            rows={14}
            aria-invalid={!!errors.body}
            aria-describedby={errors.body ? 'err-body' : 'count-body'}
            className={`input font-mono text-sm ${errors.body ? 'input-error' : ''}`}
            required
          />
          <div className="flex justify-between mt-1.5 text-xs text-text-muted">
            <span>
              {errors.body ? (
                <span id="err-body" role="alert" className="text-danger">{errors.body}</span>
              ) : null}
            </span>
            <span id="count-body">{body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}</span>
          </div>
        </div>

        <div>
          <label htmlFor="tags" className="field-label">Tags</label>
          <input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                commitTagInput();
              }
              if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
                setTags(tags.slice(0, -1));
              }
            }}
            onBlur={commitTagInput}
            placeholder="Press Enter or , to add a tag"
            className="input"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="text-text-muted hover:text-danger transition-colors"
                    aria-label={`Remove tag ${t}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.tags && <p role="alert" className="field-error">{errors.tags}</p>}
        </div>

        <div>
          <label htmlFor="collection" className="field-label">Collection</label>
          <select
            id="collection"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            className="input"
          >
            <option value="">Uncategorized</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {errors._ && <p role="alert" className="field-error">{errors._}</p>}
      </div>
    </form>
  );
}
