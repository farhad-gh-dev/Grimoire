# Grimoire

A local-first prompt library — save, organize, search, version, and (soon) share AI prompts. No accounts, no telemetry, all data lives in your browser via IndexedDB.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed URL.

## Build

```bash
npm run build
npm run preview
```

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- Dexie (IndexedDB)
- Fuse.js (fuzzy search)
- Zod (import validation)
- React Router (hash routing — works on any static host without server config)

## Where data lives

Everything is stored in your browser's IndexedDB under the `grimoire` database. Clearing site data deletes it. Use **Settings → Export** for backups.

## License

MIT.
