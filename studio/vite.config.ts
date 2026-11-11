import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: { rollupOptions: { input: { calendar: resolve(__dirname, 'index.html'), stats: resolve(__dirname, 'stats.html') } } },
});
