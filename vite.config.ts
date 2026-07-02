
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback-404',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'));
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    // Stable entry filename — cached index.html keeps working after redeploys.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://pms-backend-production-4438.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    }
  }
});
