import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative base path so assets load properly on GitHub Pages, Vercel, Netlify, etc.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});

