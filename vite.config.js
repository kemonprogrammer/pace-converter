import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Uses the repo base path in GitHub Actions, falls back to '/' locally
  base: process.env.GITHUB_ACTIONS ? '/pace-converter/' : '/',
  plugins: [
    tailwindcss(),
  ],
})
