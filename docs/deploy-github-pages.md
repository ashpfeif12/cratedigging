# Deploying to GitHub Pages

Vite static builds deploy cleanly to GitHub Pages via Actions. Here's the setup.

## 1. Update `vite.config.js` base path

If your repo is at `github.com/ashpfeif12/cratedigging`, your Pages URL will be `ashpfeif12.github.io/cratedigging/`. Update `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cratedigging/', // <-- your repo name
})
```

## 2. Add the Actions workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

## 3. Enable Pages in repo settings

1. Go to `Settings → Pages`
2. Build and deployment → **Source: GitHub Actions**
3. Push to `main` — the workflow runs, deploys, and gives you a URL.

## 4. Register the deployed URL with GetSongBPM

Once it's live at `https://ashpfeif12.github.io/cratedigging/`, that URL is your application site when registering for the GetSongBPM API key. The README's backlink is visible right there on the page.

## Alternative: Vercel (simpler)

1. Push to GitHub
2. [vercel.com/new](https://vercel.com/new) → Import this repo
3. Framework: Vite. Deploy. Done — no config needed, no base path changes.
