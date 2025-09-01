import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['js-big-decimal'],
  },
  server: {
    proxy: {
      '/api':    'http://localhost:5173/',
    },
  },
});
