import { useEffect } from 'react';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (TYPING_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export interface ShortcutHandler {
  /** Lowercase key (e.g. 'k', '/'). For Cmd/Ctrl shortcuts, set `mod: true`. */
  key: string;
  mod?: boolean;
  /** When true, fires even while focus is in an input/textarea. */
  global?: boolean;
  description?: string;
  run: (e: KeyboardEvent) => void;
}

export function useShortcuts(handlers: ShortcutHandler[]) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = isTyping(e.target);
      for (const h of handlers) {
        const wantsMod = h.mod === true;
        const hasMod = e.metaKey || e.ctrlKey;
        if (wantsMod !== hasMod) continue;
        if (e.key.toLowerCase() !== h.key.toLowerCase()) continue;
        if (typing && !h.global && !wantsMod) continue;
        e.preventDefault();
        h.run(e);
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
