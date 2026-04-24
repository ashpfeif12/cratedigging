import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use /cratedigging/ only when building for GitHub Pages.
// Vercel sets VERCEL=1; GitHub Actions sets GITHUB_ACTIONS=true.
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [react()],
  base: isGitHubPages ? '/cratedigging/' : '/',
})
