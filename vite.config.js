import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
