import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third argument '' allows loading all env vars, regardless of prefix, for the config context.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Use relative base path for compatibility with any deployment subpath
    base: './', 
    define: {
      // Ensure API_KEY is always a string.
      // PRIORITIZE: VITE_API_KEY (Standard Vite) -> API_KEY (Legacy .env)
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
      // Increase the warning limit slightly to avoid warnings for reasonably sized chunks
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Split heavy libraries into separate chunks
            if (id.includes('node_modules')) {
              if (id.includes('@google/genai')) {
                return 'vendor-genai'; // Google AI SDK is large, give it its own chunk
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react'; // React core
              }
              if (id.includes('mammoth')) {
                return 'vendor-utils'; // Document processing
              }
              // All other node_modules go to a generic vendor chunk
              return 'vendor';
            }
          }
        }
      }
    }
  }
});