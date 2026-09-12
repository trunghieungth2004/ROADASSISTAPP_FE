import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api/, '/roadassistapp-c2e37/asia-southeast1/api'),
      },
    },
  },
})
