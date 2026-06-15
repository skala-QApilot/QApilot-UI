import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    // 개발 환경에서 /api/* 호출을 Spring 게이트웨이로 포워딩
    proxy: {
      // CDP 실시간 스트리밍 WebSocket — FastAPI(8001) 직접 연결.
      // 일반 /api 규칙보다 먼저 와야 매칭된다 (더 구체적인 경로 우선).
      '/api/agent/ws': {
        target: 'ws://localhost:8001',
        ws: true,
        changeOrigin: true,
      },
      // 나머지 /api/* → Spring 게이트웨이(8080)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
