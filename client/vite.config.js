import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['jwt-decode'],   // 🔥 add this
    exclude: ['js-big-decimal'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000/',  // 🔥 api backend ku point panna vendum (5173 illa)
    },
  },
});
