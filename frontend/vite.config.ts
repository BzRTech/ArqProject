import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Em Docker o backend é "http://backend:8000"; localmente, "http://localhost:8000".
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
      '/admin': { target: apiTarget, changeOrigin: false },
      '/static': { target: apiTarget, changeOrigin: false },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    // No Node o pacote resolve para o build UMD (que espera `window.jspdf`); usar o ESM.
    alias: { 'svg2pdf.js': 'svg2pdf.js/dist/svg2pdf.es.min.js' },
  },
})
