import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev proxy forwards /api/* to the backend so the browser talks to a single
// origin (localhost:5173) in dev — no CORS setup needed.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
