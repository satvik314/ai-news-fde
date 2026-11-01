import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SerpAPI does not allow browser (CORS) requests, so the app calls /api/serp
// and Vite forwards it to serpapi.com. In production, api/serp.js does the same
// job as a serverless function (Vercel picks it up automatically).
const serpProxy = {
  '/api/serp': {
    target: 'https://serpapi.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/serp/, '/search.json'),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: serpProxy },
  preview: { proxy: serpProxy },
})
