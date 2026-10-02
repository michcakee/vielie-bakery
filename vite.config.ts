import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on GitHub Pages under any repository name.
export default defineConfig({
  plugins: [react()],
  base: './',
  // Keeps module ids on the path the project was opened from (avoids issues with
  // redirected/symlinked folders on some Windows setups).
  resolve: { preserveSymlinks: true },
  test: { environment: 'node' },
} as Parameters<typeof defineConfig>[0]);
