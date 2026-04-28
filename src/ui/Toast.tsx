import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ToastTone = 'info' | 'success' | 'danger';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
}

interface ToastApi {
  show: (message: string, opts?: { tone?: ToastTone; duration?: number }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback<ToastApi['show']>((message, opts) => {
    const id = nextId++;
    const tone = opts?.tone ?? 'info';
    const duration = opts?.duration ?? (tone === 'danger' ? 5000 : 2800);
    setToasts((prev) => [...prev, { id, message, tone, duration }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(t);
  }, [onDismiss, toast.duration]);

  const tones: Record<ToastTone, string> = {
    info: 'border-border text-text-primary',
    success: 'border-success/40 text-text-primary',
    danger: 'border-danger/50 text-text-primary',
  };
  const dots: Record<ToastTone, string> = {
    info: 'bg-accent-500',
    success: 'bg-success',
    danger: 'bg-danger',
  };

  return (
    <div
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      className={`pointer-events-auto bg-surface border ${tones[toast.tone]} rounded-md shadow-md
                  px-3 py-2.5 min-w-64 max-w-sm flex items-start gap-2.5 text-sm`}
    >
      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dots[toast.tone]}`} aria-hidden="true" />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-text-muted hover:text-text-primary transition-colors -mr-1"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
