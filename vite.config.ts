import http from 'node:http'
import https from 'node:https'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const LOCAL_API_PATH = '/roadassistapp-c2e37/asia-southeast1/api'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_DEV_API_PROXY || 'http://localhost:5001'
  const localBackend =
    proxyTarget.includes('localhost') || proxyTarget.includes('127.0.0.1')
  const proxyUrl = new URL(proxyTarget)
  const proxyAgent =
    proxyUrl.protocol === 'https:'
      ? new https.Agent({ family: 4, keepAlive: true })
      : new http.Agent({ family: 4, keepAlive: true })
  const proxy = {
    '/api': {
      target: proxyTarget,
      changeOrigin: true,
      agent: proxyAgent,
      proxyTimeout: 30_000,
      rewrite: (path: string) =>
        localBackend ? path.replace(/^\/api/, LOCAL_API_PATH) : path,
    },
  }

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
