import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Em Docker o backend é "http://backend:8000"; localmente, "http://localhost:8000".
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'
// Arquivos (plantas, imagens): o backend assina URLs para o PRÓPRIO site e o Vite repassa
// /<bucket>/ ao S3 local (SeaweedFS) mantendo o Host — sem CORS. Em produção, S3/CDN.
const s3Target = process.env.VITE_S3_PROXY_TARGET ?? 'http://localhost:8333'
const s3Bucket = process.env.VITE_S3_BUCKET ?? 'prancheta'

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
      [`/${s3Bucket}/`]: { target: s3Target, changeOrigin: false },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    // No Node o pacote resolve para o build UMD (que espera `window.jspdf`); usar o ESM.
    alias: { 'svg2pdf.js': 'svg2pdf.js/dist/svg2pdf.es.min.js' },
  },
})
