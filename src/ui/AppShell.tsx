import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { seedIfFirstRun } from '../starter';
import { listCollections, createCollection, getMeta, setMeta } from '../repo';
import { CollectionDialog } from './CollectionDialog';
import { PrivacyNotice } from './PrivacyNotice';
import { useShortcuts } from './useShortcuts';
import { LAST_ROUTE_KEY } from '../router';
import { useToast } from './Toast';

const SHORTCUT_HELP_KEY = 'grimoire:shortcut_help_seen';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [seeding, setSeeding] = useState(true);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const collections = useLiveQuery<Awaited<ReturnType<typeof listCollections>>, Awaited<ReturnType<typeof listCollections>>>(
    () => listCollections(),
    [],
    [],
  );
  const uncategorizedCount = useLiveQuery<number, number>(
    async () => {
      const all = await db.prompts.toArray();
      return all.filter((p) => p.collection_id === null).length;
    },
    [],
    0,
  );
  const totalCount = useLiveQuery<number, number>(() => db.prompts.count(), [], 0);

  useEffect(() => {
    seedIfFirstRun().finally(() => setSeeding(false));
  }, []);

  // Persist last visited route so we can restore it on next launch.
  useEffect(() => {
    try {
      if (location.pathname && location.pathname !== '/') {
        localStorage.setItem(LAST_ROUTE_KEY, location.pathname + location.search);
      }
    } catch {
      /* ignore */
    }
  }, [location.pathname, location.search]);

  function focusSearch() {
    const el = document.getElementById('search') as HTMLInputElement | null;
    if (el) {
      el.focus();
      el.select();
    } else {
      navigate('/prompts');
      // Defer focus until the list page mounts.
      setTimeout(() => {
        const after = document.getElementById('search') as HTMLInputElement | null;
        after?.focus();
      }, 50);
    }
  }

  useShortcuts([
    { key: 'k', mod: true, global: true, description: 'Focus search', run: focusSearch },
    { key: '/', description: 'Focus search', run: focusSearch },
    { key: 'c', description: 'New prompt', run: () => navigate('/prompts/new') },
    { key: 'g', description: 'Go to library', run: () => navigate('/prompts') },
    { key: '?', description: 'Show keyboard shortcuts', run: () => setShowShortcuts(true) },
  ]);

  if (seeding) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-canvas">
      <a href="#main" className="skip-link btn-primary">Skip to main content</a>

      <header className="md:hidden flex items-center justify-between h-12 px-4 border-b border-border-subtle">
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          className="btn-ghost btn-icon"
          aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileNavOpen}
        >
          <MenuIcon />
        </button>
        <NavLink to="/prompts" className="flex items-center gap-2" aria-label="Grimoire">
          <img src="/grimoire.svg" alt="" className="h-6 w-6" />
          <span className="text-md font-semibold text-text-primary">Grimoire</span>
        </NavLink>
        <NavLink to="/settings" className="btn-ghost btn-icon" aria-label="Settings">
          <SettingsIcon />
        </NavLink>
      </header>

      <Sidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        collections={collections}
        totalCount={totalCount}
        uncategorizedCount={uncategorizedCount}
        onNewCollection={() => {
          setShowNewCollection(true);
          setMobileNavOpen(false);
        }}
        onNewPrompt={() => {
          navigate('/prompts/new');
          setMobileNavOpen(false);
        }}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      <main id="main" className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>

      {showNewCollection && (
        <CollectionDialog
          mode="create"
          onClose={() => setShowNewCollection(false)}
          onSubmit={async ({ name, description }) => {
            const c = await createCollection(name, description);
            setShowNewCollection(false);
            toast.show(`Collection “${c.name}” created`, { tone: 'success' });
            navigate(`/collections/${c.id}`);
          }}
        />
      )}
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
      <PrivacyNoticeGate onShowShortcuts={() => {
        // After dismissing the privacy notice, surface the shortcut help once.
        getMeta<boolean>(SHORTCUT_HELP_KEY).then((seen) => {
          if (!seen) {
            setShowShortcuts(true);
            void setMeta(SHORTCUT_HELP_KEY, true);
          }
        });
      }} />
    </div>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collections: { id: string; name: string }[];
  totalCount: number;
  uncategorizedCount: number;
  onNewCollection: () => void;
  onNewPrompt: () => void;
  onShowShortcuts: () => void;
}

function Sidebar({
  open,
  onClose,
  collections,
  totalCount,
  uncategorizedCount,
  onNewCollection,
  onNewPrompt,
  onShowShortcuts,
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/55"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          fixed md:static inset-y-0 left-0 z-30
          w-64 md:w-64 shrink-0
          bg-surface border-r border-border-subtle
          flex flex-col
          transition-transform duration-slow ease-out
          md:h-full
        `}
        aria-label="Library navigation"
      >
        <div className="hidden md:flex items-center justify-between h-12 px-4 border-b border-border-subtle">
          <NavLink to="/prompts" className="flex items-center gap-2" aria-label="Grimoire — all prompts">
            <img src="/grimoire.svg" alt="" className="h-6 w-6" />
            <span className="text-md font-semibold text-text-primary">Grimoire</span>
          </NavLink>
          <NavLink to="/settings" className="btn-ghost btn-icon" aria-label="Settings" title="Settings">
            <SettingsIcon />
          </NavLink>
        </div>

        <div className="p-3">
          <button onClick={onNewPrompt} className="btn-primary w-full">
            <PlusIcon /> New prompt
            <span className="kbd ml-auto">C</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5 mb-6">
            <li>
              <NavLink
                to="/prompts"
                end
                onClick={onClose}
                className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
              >
                <span>All prompts</span>
                <span className="text-xs text-text-muted">{totalCount}</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/uncategorized"
                onClick={onClose}
                className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
              >
                <span>Uncategorized</span>
                <span className="text-xs text-text-muted">{uncategorizedCount}</span>
              </NavLink>
            </li>
          </ul>

          <div className="flex items-center justify-between mb-2">
            <h2 className="nav-section">Collections</h2>
            <button
              onClick={onNewCollection}
              className="btn-ghost btn-icon h-6 w-6 text-text-muted hover:text-text-primary"
              aria-label="New collection"
              title="New collection"
            >
              <PlusIcon />
            </button>
          </div>
          <ul className="space-y-0.5">
            {collections.length === 0 && (
              <li className="px-2 py-1 text-xs text-text-muted">No collections yet.</li>
            )}
            {collections.map((c) => (
              <li key={c.id}>
                <NavLink
                  to={`/collections/${c.id}`}
                  onClick={onClose}
                  className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
                >
                  <span className="truncate">{c.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-3 py-3 border-t border-border-subtle">
          <button
            onClick={onShowShortcuts}
            className="btn-ghost w-full justify-between text-text-muted text-xs"
          >
            <span>Keyboard shortcuts</span>
            <span className="kbd">?</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function PrivacyNoticeGate({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getMeta<boolean>('privacy_notice_acked').then((acked) => {
      if (!cancelled && !acked) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!show) return null;
  return (
    <PrivacyNotice
      onAck={async () => {
        await setMeta('privacy_notice_acked', true);
        setShow(false);
        onShowShortcuts();
      }}
    />
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: { keys: string[]; label: string }[] = [
    { keys: ['/'], label: 'Focus search' },
    { keys: ['⌘', 'K'], label: 'Focus search (also works while typing)' },
    { keys: ['C'], label: 'Create new prompt' },
    { keys: ['G'], label: 'Go to library' },
    { keys: ['?'], label: 'Show this help' },
    { keys: ['Esc'], label: 'Close any dialog' },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="sc-title" className="scrim" onClick={onClose}>
      <div className="dialog max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 id="sc-title" className="text-md text-text-primary mb-4">Keyboard shortcuts</h2>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 text-sm text-text-secondary">
              <span>{r.label}</span>
              <span className="flex gap-1">
                {r.keys.map((k) => (
                  <span key={k} className="kbd">{k}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-secondary" autoFocus>Close</button>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.91 1.65 1.65 0 0 0 4.27 7.09l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
