import { z } from 'zod';

export const TITLE_MAX = 200;
export const BODY_MAX = 50_000;
export const TAGS_MAX = 20;
export const TAG_MAX = 40;
export const COLLECTION_NAME_MAX = 80;
export const COLLECTION_DESC_MAX = 500;
export const VERSION_RETENTION = 50;

export const promptSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(TITLE_MAX),
  body: z.string().min(1).max(BODY_MAX),
  tags: z.array(z.string().min(1).max(TAG_MAX)).max(TAGS_MAX),
  collection_id: z.string().uuid().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
});
export type Prompt = z.infer<typeof promptSchema>;

export const collectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(COLLECTION_NAME_MAX),
  description: z.string().max(COLLECTION_DESC_MAX).default(''),
  created_at: z.number().int(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const versionSchema = z.object({
  id: z.string().uuid(),
  prompt_id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  version_created_at: z.number().int(),
});
export type PromptVersion = z.infer<typeof versionSchema>;

export const EXPORT_SCHEMA_VERSION = 1;
export const exportFileSchema = z.object({
  schema_version: z.literal(EXPORT_SCHEMA_VERSION),
  exported_at: z.number().int(),
  prompts: z.array(promptSchema),
  collections: z.array(collectionSchema),
  versions: z.array(versionSchema).default([]),
});
export type ExportFile = z.infer<typeof exportFileSchema>;
