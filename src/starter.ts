import { v4 as uuid } from 'uuid';
import { db } from './db';
import { getMeta, setMeta } from './repo';
import type { Collection, Prompt } from './types';

const FIRST_RUN_KEY = 'first_run_completed';
const STARTER_NAME = 'Default prompts';

interface StarterPrompt {
  title: string;
  body: string;
  tags: string[];
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    title: 'Concise summarizer',
    body: 'Summarize the following text in 3 to 5 bullet points. Keep each bullet under 20 words. Preserve key facts, names, and numbers. Drop filler.\n\n---\n[paste text here]',
    tags: ['summarize', 'writing'],
  },
  {
    title: 'Code review (general)',
    body: 'Review the code below. Call out: (1) bugs or logic errors, (2) security issues, (3) readability problems, (4) any non-idiomatic patterns. Be specific with line references. Skip nitpicks unless they affect correctness.\n\n```\n[paste code here]\n```',
    tags: ['code', 'review'],
  },
  {
    title: 'Rubber-duck debugger',
    body: 'I am debugging a problem. Ask me clarifying questions one at a time until you have enough context to suggest the most likely root cause. Do not propose fixes until you understand the failure.\n\nProblem: [describe]',
    tags: ['code', 'debugging'],
  },
  {
    title: 'Writing critique',
    body: 'Critique the following writing for clarity, structure, and tone. Quote the weakest sentence and rewrite it. Then list three structural issues, ordered by impact.\n\n---\n[paste text here]',
    tags: ['writing', 'editing'],
  },
  {
    title: 'Brainstorm divergent ideas',
    body: 'Generate 10 distinct ideas for the following goal. Vary the angle: include at least one contrarian, one minimal-effort, and one ambitious idea. One sentence each. No preamble.\n\nGoal: [describe]',
    tags: ['brainstorm', 'ideation'],
  },
  {
    title: 'Explain like I am five',
    body: 'Explain the following concept in plain language to a curious 10-year-old. Use one concrete analogy. Avoid jargon. Three short paragraphs maximum.\n\nConcept: [topic]',
    tags: ['explain', 'learning'],
  },
  {
    title: 'Refactor for readability',
    body: 'Refactor the code below for readability without changing its behavior. Prioritize: clearer names, smaller functions, eliminating dead branches. Show the diff and a one-line rationale per change.\n\n```\n[paste code here]\n```',
    tags: ['code', 'refactor'],
  },
  {
    title: 'Conventional commit message',
    body: 'Write a commit message in Conventional Commits format for the diff below. One subject line under 70 chars, then a body explaining the why (not the what) in 2 to 4 sentences.\n\n```\n[paste diff here]\n```',
    tags: ['code', 'git'],
  },
];

export async function seedIfFirstRun(): Promise<void> {
  const done = await getMeta<boolean>(FIRST_RUN_KEY);
  if (done) return;

  const now = Date.now();
  const collection: Collection = {
    id: uuid(),
    name: STARTER_NAME,
    description: 'A starter set of prompts to give you something to work with. Delete any you do not need.',
    created_at: now,
  };
  const prompts: Prompt[] = STARTER_PROMPTS.map((p, i) => ({
    id: uuid(),
    title: p.title,
    body: p.body,
    tags: p.tags,
    collection_id: collection.id,
    created_at: now + i,
    updated_at: now + i,
  }));

  await db.transaction('rw', db.collections, db.prompts, db.meta, async () => {
    await db.collections.add(collection);
    await db.prompts.bulkAdd(prompts);
    await setMeta(FIRST_RUN_KEY, true);
  });
}
