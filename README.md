<div align="center">

<img src="public/grimoire.svg" alt="Grimoire" width="72" height="72" />

# Grimoire

**A local-first prompt library — save, organize, search, and version your AI prompts.**

No accounts. No servers. No telemetry. Everything lives in your browser.

[**Open the live app →**](https://farhad-gh-dev.github.io/Grimoire/)

[![Deploy](https://github.com/farhad-gh-dev/Grimoire/actions/workflows/deploy.yml/badge.svg)](https://github.com/farhad-gh-dev/Grimoire/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
![Local-first](https://img.shields.io/badge/data-stays%20on%20your%20device-success)

</div>

---

## What it is

Grimoire is a place to keep the prompts you actually reuse — the code-review prompt, the summarizer, the one you spent an hour tuning — instead of losing them in chat history or scattered notes.

It runs entirely in your browser. Your prompts are stored locally in IndexedDB and never leave your device. There is no backend to sign up for, no sync account, and nothing phoning home. Open the [hosted app](https://farhad-gh-dev.github.io/Grimoire/) or self-host it on any static file server — the data is yours either way.

## Features

- 📝 **Prompt management** — create, edit, and delete prompts with a title, body, and tags.
- 🗂️ **Collections** — group related prompts; deleting a collection keeps its prompts (they just become uncategorized).
- 🔍 **Fuzzy search** — instant search across titles, tags, and bodies powered by [Fuse.js](https://fusejs.io/), with tag filtering on the side.
- 🕓 **Automatic versioning** — every edit snapshots the previous state. Browse the history of any prompt and revert to an earlier version in one click (last 50 versions kept per prompt).
- 📋 **One-click copy** — copy a prompt body straight to your clipboard.
- 📤 **Export & import** — back up your whole library as JSON, or export a single prompt as Markdown (with YAML frontmatter). Imports are schema-validated and support **merge** or **replace** modes.
- ⌨️ **Keyboard-driven** — search, create, and navigate without touching the mouse (see [shortcuts](#keyboard-shortcuts)).
- 🚀 **Starter prompts** — a small, curated set is seeded on first run so the app isn't empty. Delete what you don't need.
- 🔒 **Private by design** — no accounts, no analytics, no network calls. A storage-usage meter in Settings shows how much space your library uses.
- 📱 **Responsive & accessible** — works on mobile, with skip links, focus traps, and ARIA labels throughout.

## Quick start

Requires **Node 20+**.

```bash
git clone https://github.com/farhad-gh-dev/Grimoire.git
cd Grimoire
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Build & preview

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
```

### Scripts

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR            |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/`    |
| `npm run preview` | Preview the production build                  |
| `npm run lint`    | Type-check only (no emit)                     |

## Keyboard shortcuts

| Key            | Action                      |
| -------------- | --------------------------- |
| `Ctrl/Cmd + K` | Focus search                |
| `/`            | Focus search                |
| `c`            | New prompt                  |
| `g`            | Go to library               |
| `?`            | Show all keyboard shortcuts |
| `Esc`          | Close any dialog            |

## Where your data lives

Everything is stored in your browser's **IndexedDB** under a database named `grimoire`, via [Dexie](https://dexie.org/). Small UI preferences (like your last-visited page) use `localStorage`.

A few things worth knowing:

- **Clearing site data deletes your library.** Use **Settings → Export** for backups.
- **Data is per-browser, per-origin.** Prompts saved in Chrome won't appear in Firefox, and the hosted app and a local copy are separate stores. Move data between them with Export/Import.
- **Nothing is ever uploaded.** There is no server component at all.

## Tech stack

- **[React 18](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)** + **[Vite](https://vitejs.dev/)**
- **[Tailwind CSS](https://tailwindcss.com/)** for styling
- **[Dexie](https://dexie.org/)** (+ `dexie-react-hooks`) for IndexedDB with live queries
- **[Fuse.js](https://fusejs.io/)** for fuzzy search
- **[Zod](https://zod.dev/)** for runtime validation of imports and data
- **[React Router](https://reactrouter.com/)** in **hash mode** — so the app works on any static host with no server-side routing config

## Project structure

```
src/
├── db.ts            # Dexie database schema
├── types.ts         # Zod schemas + types (Prompt, Collection, Version)
├── repo.ts          # Data layer: CRUD, validation, versioning
├── io.ts            # Export/import, Markdown serialization
├── search.ts        # Fuse.js search + tag filtering
├── starter.ts       # First-run starter prompts
├── storage.ts       # Storage-quota estimate helpers
├── router.tsx       # Hash routes
└── ui/              # React components, pages, hooks
```

## Deployment

The included GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) builds and publishes to **GitHub Pages** on every push to `main`.

Because Grimoire is a fully static, hash-routed SPA, you can host the `dist/` output anywhere — Netlify, Vercel, Cloudflare Pages, S3, or your own server.

> **Forking note:** the Vite `base` defaults to `/Grimoire/` on GitHub Actions to match the repo name. If you deploy under a different path, set the `VITE_BASE` environment variable at build time (e.g. `VITE_BASE=/my-prompts/ npm run build`).

## Roadmap

- 🔗 **Share via URL** — export a prompt as a shareable link, encoded in the URL with no server involved.
- 🧩 **Prompt variables / templating** — `{{placeholders}}` you fill in at copy time.

## License

MIT — do whatever you like.
