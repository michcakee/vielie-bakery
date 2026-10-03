import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string;

// Relative base so the build works on GitHub Pages under any repository name.
export default defineConfig({
  plugins: [react()],
  base: './',
  // Shown on the main menu, so a player can say which build they are on.
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Keeps module ids on the path the project was opened from (avoids issues with
  // redirected/symlinked folders on some Windows setups).
  resolve: { preserveSymlinks: true },
  // React in its own chunk keeps game-code updates small. Everything still loads up front so the game works offline.
  build: { rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'] } } } },
  test: { environment: 'node' },
} as Parameters<typeof defineConfig>[0]);
