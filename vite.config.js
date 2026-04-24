import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // works for GitHub Pages, Vercel, Netlify, static hosts
})
