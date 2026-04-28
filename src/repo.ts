import { v4 as uuid } from 'uuid';
import { db } from './db';
import {
  type Collection,
  type Prompt,
  type PromptVersion,
  TITLE_MAX,
  BODY_MAX,
  TAGS_MAX,
  TAG_MAX,
  COLLECTION_NAME_MAX,
  COLLECTION_DESC_MAX,
  VERSION_RETENTION,
} from './types';

export interface PromptInput {
  title: string;
  body: string;
  tags: string[];
  collection_id: string | null;
}

export class ValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

function normalizeTags(tags: string[]): string[] {
  const cleaned = tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of cleaned) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(t);
    }
  }
  return result;
}

function validatePrompt(input: PromptInput): PromptInput {
  const title = input.title.trim();
  const body = input.body.trim();
  const tags = normalizeTags(input.tags);
  if (title.length === 0) throw new ValidationError('title', 'Title is required.');
  if (title.length > TITLE_MAX) throw new ValidationError('title', `Title must be at most ${TITLE_MAX} characters.`);
  if (body.length === 0) throw new ValidationError('body', 'Body is required.');
  if (body.length > BODY_MAX) throw new ValidationError('body', `Body must be at most ${BODY_MAX} characters.`);
  if (tags.length > TAGS_MAX) throw new ValidationError('tags', `At most ${TAGS_MAX} tags allowed.`);
  for (const t of tags) {
    if (t.length > TAG_MAX) throw new ValidationError('tags', `Each tag must be at most ${TAG_MAX} characters.`);
  }
  return { title, body, tags, collection_id: input.collection_id };
}

function validateCollection(name: string, description: string): { name: string; description: string } {
  const n = name.trim();
  const d = description.trim();
  if (n.length === 0) throw new ValidationError('name', 'Collection name is required.');
  if (n.length > COLLECTION_NAME_MAX) throw new ValidationError('name', `Name must be at most ${COLLECTION_NAME_MAX} characters.`);
  if (d.length > COLLECTION_DESC_MAX) throw new ValidationError('description', `Description must be at most ${COLLECTION_DESC_MAX} characters.`);
  return { name: n, description: d };
}

export async function createPrompt(input: PromptInput): Promise<Prompt> {
  const v = validatePrompt(input);
  const now = Date.now();
  const prompt: Prompt = {
    id: uuid(),
    title: v.title,
    body: v.body,
    tags: v.tags,
    collection_id: v.collection_id,
    created_at: now,
    updated_at: now,
  };
  await db.prompts.add(prompt);
  return prompt;
}

export async function updatePrompt(id: string, input: PromptInput): Promise<Prompt> {
  const v = validatePrompt(input);
  return db.transaction('rw', db.prompts, db.versions, async () => {
    const existing = await db.prompts.get(id);
    if (!existing) throw new Error('Prompt not found.');

    const snapshot: PromptVersion = {
      id: uuid(),
      prompt_id: id,
      title: existing.title,
      body: existing.body,
      tags: existing.tags,
      version_created_at: existing.updated_at,
    };
    await db.versions.add(snapshot);

    const all = await db.versions.where('prompt_id').equals(id).sortBy('version_created_at');
    if (all.length > VERSION_RETENTION) {
      const excess = all.slice(0, all.length - VERSION_RETENTION);
      await db.versions.bulkDelete(excess.map((x) => x.id));
    }

    const updated: Prompt = {
      ...existing,
      title: v.title,
      body: v.body,
      tags: v.tags,
      collection_id: v.collection_id,
      updated_at: Date.now(),
    };
    await db.prompts.put(updated);
    return updated;
  });
}

export async function deletePrompt(id: string): Promise<void> {
  await db.transaction('rw', db.prompts, db.versions, async () => {
    await db.prompts.delete(id);
    const versions = await db.versions.where('prompt_id').equals(id).primaryKeys();
    await db.versions.bulkDelete(versions);
  });
}

export async function getPrompt(id: string): Promise<Prompt | undefined> {
  return db.prompts.get(id);
}

export async function listPrompts(): Promise<Prompt[]> {
  return db.prompts.orderBy('updated_at').reverse().toArray();
}

export async function listVersions(promptId: string): Promise<PromptVersion[]> {
  const versions = await db.versions.where('prompt_id').equals(promptId).toArray();
  return versions.sort((a, b) => b.version_created_at - a.version_created_at);
}

export async function revertToVersion(promptId: string, versionId: string): Promise<Prompt> {
  const version = await db.versions.get(versionId);
  if (!version || version.prompt_id !== promptId) throw new Error('Version not found.');
  const current = await db.prompts.get(promptId);
  if (!current) throw new Error('Prompt not found.');
  return updatePrompt(promptId, {
    title: version.title,
    body: version.body,
    tags: version.tags,
    collection_id: current.collection_id,
  });
}

export async function createCollection(name: string, description = ''): Promise<Collection> {
  const v = validateCollection(name, description);
  const collection: Collection = {
    id: uuid(),
    name: v.name,
    description: v.description,
    created_at: Date.now(),
  };
  await db.collections.add(collection);
  return collection;
}

export async function updateCollection(id: string, name: string, description: string): Promise<Collection> {
  const v = validateCollection(name, description);
  const existing = await db.collections.get(id);
  if (!existing) throw new Error('Collection not found.');
  const updated: Collection = { ...existing, name: v.name, description: v.description };
  await db.collections.put(updated);
  return updated;
}

export async function deleteCollection(id: string): Promise<void> {
  await db.transaction('rw', db.collections, db.prompts, async () => {
    const contained = await db.prompts.where('collection_id').equals(id).toArray();
    for (const p of contained) {
      await db.prompts.put({ ...p, collection_id: null });
    }
    await db.collections.delete(id);
  });
}

export async function listCollections(): Promise<Collection[]> {
  return db.collections.orderBy('name').toArray();
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.prompts, db.versions, db.collections, async () => {
    await db.prompts.clear();
    await db.versions.clear();
    await db.collections.clear();
  });
}
