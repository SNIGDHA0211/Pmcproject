
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
    // Do NOT split react into a separate manual chunk: that creates
    // vendor <-> react-vendor cycles and a blank production page.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Heavy, leaf libraries only — safe to isolate.
          if (id.includes('exceljs')) return 'excel';
          if (id.includes('recharts') || id.includes('/d3-')) return 'charts';
        },
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
