import { db } from './db';
import { wipeAll } from './repo';
import {
  EXPORT_SCHEMA_VERSION,
  type ExportFile,
  exportFileSchema,
  type Prompt,
} from './types';

export async function exportAll(): Promise<ExportFile> {
  const [prompts, collections, versions] = await Promise.all([
    db.prompts.toArray(),
    db.collections.toArray(),
    db.versions.toArray(),
  ]);
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    exported_at: Date.now(),
    prompts,
    collections,
    versions,
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(filename, blob);
}

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  promptsAdded: number;
  collectionsAdded: number;
  versionsAdded: number;
  promptsSkipped: number;
  collectionsSkipped: number;
}

export async function importFromText(text: string, mode: ImportMode): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  const result = exportFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('File does not match the Grimoire export schema.');
  }
  const data = result.data;

  if (mode === 'replace') {
    await wipeAll();
  }

  const r: ImportResult = {
    promptsAdded: 0,
    collectionsAdded: 0,
    versionsAdded: 0,
    promptsSkipped: 0,
    collectionsSkipped: 0,
  };

  await db.transaction('rw', db.prompts, db.collections, db.versions, async () => {
    const existingPromptIds = new Set(await db.prompts.toCollection().primaryKeys());
    const existingCollectionIds = new Set(await db.collections.toCollection().primaryKeys());

    for (const c of data.collections) {
      if (existingCollectionIds.has(c.id)) {
        r.collectionsSkipped++;
        continue;
      }
      await db.collections.add(c);
      existingCollectionIds.add(c.id);
      r.collectionsAdded++;
    }
    for (const p of data.prompts) {
      if (existingPromptIds.has(p.id)) {
        r.promptsSkipped++;
        continue;
      }
      await db.prompts.add(p);
      existingPromptIds.add(p.id);
      r.promptsAdded++;
    }
    for (const v of data.versions) {
      const exists = await db.versions.get(v.id);
      if (exists) continue;
      await db.versions.add(v);
      r.versionsAdded++;
    }
  });
  return r;
}

export function promptToMarkdown(prompt: Prompt): string {
  const fm = ['---', `title: ${jsonString(prompt.title)}`];
  if (prompt.tags.length > 0) {
    fm.push(`tags: [${prompt.tags.map(jsonString).join(', ')}]`);
  }
  fm.push(`created_at: ${new Date(prompt.created_at).toISOString()}`);
  fm.push(`updated_at: ${new Date(prompt.updated_at).toISOString()}`);
  fm.push('---', '');
  return fm.join('\n') + prompt.body + '\n';
}

function jsonString(s: string): string {
  return JSON.stringify(s);
}

export function safeFilename(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'prompt';
}
