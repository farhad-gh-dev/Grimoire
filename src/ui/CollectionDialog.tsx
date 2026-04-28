import { useEffect, useState } from 'react';
import { COLLECTION_DESC_MAX, COLLECTION_NAME_MAX } from '../types';
import { useFocusTrap } from './useFocusTrap';

interface Props {
  mode: 'create' | 'edit';
  initial?: { name: string; description: string };
  onClose: () => void;
  onSubmit: (v: { name: string; description: string }) => Promise<void> | void;
}

export function CollectionDialog({ mode, initial, onClose, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useFocusTrap<HTMLFormElement>();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name, description });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save collection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cd-title"
      className="scrim"
      onClick={onClose}
    >
      <form
        ref={ref}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="dialog max-w-md"
      >
        <h2 id="cd-title" className="text-md text-text-primary mb-4">
          {mode === 'create' ? 'New collection' : 'Edit collection'}
        </h2>
        <div className="mb-4">
          <label htmlFor="cd-name" className="field-label">Name</label>
          <input
            id="cd-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={COLLECTION_NAME_MAX}
            className="input"
            required
          />
        </div>
        <div className="mb-5">
          <label htmlFor="cd-desc" className="field-label">Description (optional)</label>
          <textarea
            id="cd-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={COLLECTION_DESC_MAX}
            className="input"
            rows={3}
          />
        </div>
        {error && <p role="alert" className="field-error mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
