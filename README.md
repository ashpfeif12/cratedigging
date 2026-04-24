# Cratedigging — The Setlist Architect

A harmonic-mixing-aware setlist planner for House / Tech House DJs. Build your sets around an anchor track, visualize the energy arc, check transitions on the Camelot wheel, and recommend from your own crate — not a static library.

## Why

Bedroom DJs treat sets like playlists. Great DJs treat them like architecture. This tool helps you:

- **Plan anchor-first** — start from the one track you know you're playing, build outward
- **Import from your actual sources** — 1001tracklists URLs, Beatport charts, Rekordbox XML, manual entry
- **Auto-enrich BPM & Camelot keys** via [GetSongBPM.com](https://getsongbpm.com) (free API)
- **Visualize the five-phase arc** — Invitation → Build → Peak → Reset → Send-Off
- **Check harmonic transitions** — flags risky key jumps and BPM gaps
- **Export** — drop the setlist back into Rekordbox or copy for performance notes

## Powered by GetSongBPM

**Tempo, key and Camelot data powered by [GetSongBPM.com](https://getsongbpm.com)** — a free API for BPM and harmonic mixing data. Register for a free API key at [getsongbpm.com/api](https://getsongbpm.com/api) and paste it into the tool's Settings tab.

## Running locally

```bash
# clone
git clone https://github.com/ashpfeif12/cratedigging.git
cd cratedigging

# install
npm install

# dev server
npm run dev
# → http://localhost:5173

# production build
npm run build
# → output in dist/
```

## Deploying

This is a static Vite + React app — deploy anywhere.

**Vercel** (easiest):
1. Push to GitHub (this repo)
2. Import on [vercel.com/new](https://vercel.com/new)
3. Framework preset: Vite. Deploy.

**Netlify:**
1. [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
2. Build command: `npm run build` · Publish directory: `dist`

**GitHub Pages:**
See [docs/deploy-github-pages.md](docs/deploy-github-pages.md) for the Actions workflow.

## How to use

1. **Get a GetSongBPM key** — free at [getsongbpm.com/api](https://getsongbpm.com/api). Register with this repo's URL as your application site (the backlink requirement is already satisfied by this README).
2. **Open the Crate Manager** (top right, "Crate" button).
3. **API Key tab** — paste your key.
4. **Build your crate:**
   - **From 1001TL** — paste a set URL from [1001tracklists.com](https://www.1001tracklists.com). Tool extracts track names via JSON-LD parsing.
   - **Beatport Paste** — copy a chart page from Beatport, paste the text. No scraping.
   - **Rekordbox** — export your library as XML (`File → Export Collection in xml format`) and upload. Your actual BPM and key data comes along.
   - **Manual** — add tracks by hand with full tagging.
5. **Hit "Enrich all"** — auto-fills missing BPM and Camelot keys. Rate-limited to stay under GetSongBPM's 3000/hr limit.
6. **Pick your anchor** — the one track you know you're playing. Usually a peak-time heater. Drop it in the Peak phase, click the anchor icon.
7. **Let recommendations fill the arc** — each phase suggests tracks from your crate scored by Camelot compatibility with your anchor, BPM proximity, and phase fit.
8. **Check transitions** — bottom of the page flags risky key jumps and BPM gaps >3.
9. **Export** — downloadable setlist with phase structure, anchor marked, and full metadata.

## The craft

See [docs/setlist-craft-guide.md](docs/setlist-craft-guide.md) for the setlist theory this tool is built on — the five phases, anchor-first method, Camelot wheel rules, BPM strategy, and the 10 mistakes that kill sets.

See [docs/architecture.md](docs/architecture.md) for the system design and roadmap.

## Project structure

```
cratedigging/
├── src/
│   ├── main.jsx              # entry point
│   ├── index.css             # global styles + Tailwind
│   └── SetlistArchitect.jsx  # the whole app (single-file React component)
├── docs/
│   ├── setlist-craft-guide.md
│   └── architecture.md
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Credits

- **[GetSongBPM.com](https://getsongbpm.com)** — tempo, key and Camelot data. Their free API powers the enrichment feature. Backlink required by their terms; this is that backlink.
- **[1001tracklists](https://www.1001tracklists.com)** — DJ set database. The tool parses tracklist URLs you provide; no bulk scraping.
- **[Mixed In Key](https://mixedinkey.com)** — the Camelot wheel system for harmonic mixing.
- **Lucide** — icons.
- **Tailwind + Vite + React** — stack.

## License

MIT — use it, modify it, share it. Attribution to GetSongBPM is required by their API terms, not mine.

---

*Keep building. Every set you play teaches you something about the next one.*
