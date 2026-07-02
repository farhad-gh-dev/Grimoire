import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from /Grimoire/, locally from /.
// Override with VITE_BASE if you fork to a repo with a different name.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/Grimoire/' : '/');

export default defineConfig({
  base,
  plugins: [react()],
});
