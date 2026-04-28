import { useEffect } from 'react';
import { useFocusTrap } from './useFocusTrap';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cf-title"
      className="scrim"
      onClick={onCancel}
    >
      <div ref={ref} className="dialog max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 id="cf-title" className="text-md text-text-primary mb-2">{title}</h2>
        <p className="text-sm text-text-secondary mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">{cancelLabel}</button>
          <button onClick={onConfirm} className={destructive ? 'btn-danger' : 'btn-primary'} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
