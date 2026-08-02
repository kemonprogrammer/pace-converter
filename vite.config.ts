import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Uses the repo base path in GitHub Actions, falls back to '/' locally
  base: process.env.GITHUB_ACTIONS ? '/pace-converter/' : '/',
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      injectRegister: 'auto',
      includeAssets: ['icon-64.png', 'icon-192.png', 'icon-512.png', 'icon-white-512.png', 'favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pace Converter',
        short_name: 'PaceConverter',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0f172b',
        theme_color: '#616ccc',
        icons: [
          {
            src: 'icon-64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-white-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ]
      }
    })
  ],
})
