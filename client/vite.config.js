// vite.config.js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['jwt-decode'], // optional if you still use it
    exclude: ['js-big-decimal'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000', // point to your local backend port
    },
  },
});
