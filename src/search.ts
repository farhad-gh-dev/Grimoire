import Fuse from 'fuse.js';
import type { Prompt } from './types';

export interface SearchOptions {
  query: string;
  tags: string[];
}

export function filterByTags(prompts: Prompt[], tags: string[]): Prompt[] {
  if (tags.length === 0) return prompts;
  const set = new Set(tags.map((t) => t.toLowerCase()));
  return prompts.filter((p) => p.tags.some((t) => set.has(t.toLowerCase())));
}

export function searchPrompts(prompts: Prompt[], { query, tags }: SearchOptions): Prompt[] {
  const filtered = filterByTags(prompts, tags);
  const q = query.trim();
  if (q.length === 0) return filtered;
  const fuse = new Fuse(filtered, {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'tags', weight: 0.3 },
      { name: 'body', weight: 0.2 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
  return fuse.search(q).map((r) => r.item);
}

export function allTags(prompts: Prompt[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  const display = new Map<string, string>();
  for (const p of prompts) {
    for (const t of p.tags) {
      const key = t.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!display.has(key)) display.set(key, t);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ tag: display.get(key)!, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
