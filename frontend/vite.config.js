import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server runs on http://localhost:3000.
// Requests to /api are forwarded to the AI server (http://127.0.0.1:5000),
// so the browser never deals with CORS during development.
// Data, sign-in and files go straight to Supabase from the browser.
// AI server address (override with BACKEND_URL if you run it somewhere else)
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
    },
  },
});
