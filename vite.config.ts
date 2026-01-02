
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: './', 
    define: {
      // Inject VITE_API_KEY or API_KEY into process.env.API_KEY.
      // We rely on the index.html window.process polyfill to prevent ReferenceErrors if replacement fails.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || '')
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './setupTests.ts',
      css: true,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('@google/genai')) return 'vendor-genai';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('mammoth')) return 'vendor-utils';
              return 'vendor';
            }
          }
        }
      }
    }
  }
});
