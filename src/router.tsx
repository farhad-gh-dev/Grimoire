import { createHashRouter, Navigate } from 'react-router-dom';
import { AppShell } from './ui/AppShell';
import { PromptListPage } from './ui/PromptListPage';
import { PromptDetailPage } from './ui/PromptDetailPage';
import { PromptEditPage } from './ui/PromptEditPage';
import { PromptHistoryPage } from './ui/PromptHistoryPage';
import { SettingsPage } from './ui/SettingsPage';
import { NotFoundPage } from './ui/NotFoundPage';

export const LAST_ROUTE_KEY = 'grimoire:last_route';

function InitialRoute() {
  let target = '/prompts';
  try {
    const saved = localStorage.getItem(LAST_ROUTE_KEY);
    if (saved && saved.startsWith('/') && saved !== '/') target = saved;
  } catch {
    /* localStorage unavailable; fall through */
  }
  return <Navigate to={target} replace />;
}

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <InitialRoute /> },
      { path: 'prompts', element: <PromptListPage /> },
      { path: 'prompts/new', element: <PromptEditPage mode="create" /> },
      { path: 'prompts/:id', element: <PromptDetailPage /> },
      { path: 'prompts/:id/edit', element: <PromptEditPage mode="edit" /> },
      { path: 'prompts/:id/history', element: <PromptHistoryPage /> },
      { path: 'collections/:collectionId', element: <PromptListPage /> },
      { path: 'uncategorized', element: <PromptListPage uncategorized /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
