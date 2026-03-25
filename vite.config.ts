import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GymMemo',
        short_name: 'GymMemo',
        description: '운동 기록 트래커',
        theme_color: '#0A0A12',
        background_color: '#0A0A12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'favicon.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon.png', sizes: '512x512', type: 'image/png' },
          { src: 'favicon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gym-memo\.gym-memo-hyunseo\.workers\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
})