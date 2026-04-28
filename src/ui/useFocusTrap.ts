import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Traps focus inside the returned ref while active, and restores focus to the
 * previously focused element when the trap unmounts.
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getNodes(): HTMLElement[] {
      return Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
      );
    }

    // Move initial focus inside.
    const nodes = getNodes();
    const initial = container.querySelector<HTMLElement>('[autofocus]') ?? nodes[0] ?? container;
    initial.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const items = getNodes();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container!.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', onKey);
    return () => {
      container.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
