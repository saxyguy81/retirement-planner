import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Retirement Planner',
        short_name: 'RetirePlan',
        description: 'Comprehensive retirement planning tool',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/retirement-planner/',
        start_url: '/retirement-planner/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,  // We control this via prompt
        clientsClaim: true
      }
    })
  ],
  base: '/retirement-planner/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - rarely changes, cache separately
          'vendor-react': ['react', 'react-dom'],

          // Charting library - large, used by multiple tabs
          'vendor-recharts': ['recharts'],

          // Export libraries - only loaded when exporting
          'vendor-export': ['xlsx', 'jspdf', 'jspdf-autotable'],

          // Icons - used everywhere, cache separately
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
});
