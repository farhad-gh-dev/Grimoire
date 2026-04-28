import Dexie, { type Table } from 'dexie';
import type { Collection, Prompt, PromptVersion } from './types';

export class GrimoireDB extends Dexie {
  prompts!: Table<Prompt, string>;
  collections!: Table<Collection, string>;
  versions!: Table<PromptVersion, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('grimoire');
    this.version(1).stores({
      prompts: 'id, collection_id, updated_at, created_at, *tags',
      collections: 'id, created_at, name',
      versions: 'id, prompt_id, version_created_at',
      meta: 'key',
    });
  }
}

export const db = new GrimoireDB();
