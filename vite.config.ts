import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      base: './',
      plugins: [react()],
      define: {
        'global': 'globalThis',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'lucide-react/icons': path.resolve(__dirname, 'node_modules/lucide-react/dist/esm/icons'),
        }
      },
      optimizeDeps: {
        exclude: [],
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              pdf: ['jspdf', 'html2canvas'],
              zip: ['jszip'],
              i18n: ['i18next', 'react-i18next'],
            }
          }
        }
      }
    };
});
