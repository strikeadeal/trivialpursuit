import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the site from https://<user>.github.io/<repo>/.
// Set this to '/<your repo name>/' (keep both slashes).
const BASE = '/trivialpursuit/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // 'prompt': a new version waits until the player taps the update banner.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE,
        start_url: BASE,
        scope: BASE,
        name: 'Eight Track Trivia',
        short_name: 'Eight Track',
        description: 'Pass-and-play trivia board game for 2 to 6 players.',
        lang: 'en-AU',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1d1730',
        background_color: '#1d1730',
        icons: [
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything the build produces. The questions are bundled into the JS.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
})
