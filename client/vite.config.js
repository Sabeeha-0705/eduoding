// vite.config.js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    // ✅ PWA Plugin
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png'],
      manifest: {
        name: 'Eduoding',
        short_name: 'Eduoding',
        description: 'Online Learning Platform',
        theme_color: '#057A75',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],

  // keep your existing optimizations
  optimizeDeps: {
    include: ['jwt-decode'],
    exclude: ['js-big-decimal'],
  },

  // dev proxy (local backend)
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
