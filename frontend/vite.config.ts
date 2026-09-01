import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Docker Desktop on Windows doesn't reliably forward filesystem change
    // events across the bind mount, so native fs.watch silently misses
    // edits and Vite keeps serving a stale cached transform. Polling is
    // slightly heavier but actually detects changes in that setup.
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
