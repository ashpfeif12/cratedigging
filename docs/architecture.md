# The Setlist Architect — System Design

## The core insight

The unique part of any DJ's setlist tool **is not the tool** — it's *their crate*. Every DJ builds a personal database of records they know. The job of the software is to:

1. Make building that crate effortless (import from many sources)
2. Enrich it with mixing metadata (BPM, key, energy, phase)
3. Recommend from the crate intelligently for each phase of a set
4. Check the journey's shape (energy arc, transitions, vocal spacing)
5. Export what the DJ actually prepares with (Rekordbox)

## Data source reality check (as of April 2026)

| Source | Status | Notes |
|---|---|---|
| **Spotify Audio Features API** | ❌ Deprecated for new apps (Nov 27, 2024) | BPM/key/energy endpoint gone. Only apps approved before cutoff still have access. |
| **1001tracklists API** | ❌ No official API | Unofficial Python scrapers exist but fragile; ToS restricts commercial scraping. |
| **Beatport API** | ⚠️ Partner-only | Not available to individual developers. |
| **GetSongBPM** | ✅ Free API | BPM + Camelot key for most released tracks. Requires attribution. |
| **Rekordbox XML export** | ✅ File-based | User exports their own library — most reliable source of truth. |
| **ReccoBeats / SoundNet / Musicae** | ✅ Paid Spotify-analog APIs | $ per call; accuracy varies. |

## Architecture (ideal, full build)

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE SETLIST ARCHITECT                        │
└─────────────────────────────────────────────────────────────────┘

INGESTION LAYER (how tracks get into your crate)
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ 1001TL URL   │  │ Rekordbox    │  │ Manual entry /       │  │
│  │ Parser       │  │ XML importer │  │ Beatport chart paste │  │
│  │ (scrape HTML)│  │ (your truth) │  │ (filling gaps)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                      │
│              ┌──────────────────────────┐                       │
│              │  ENRICHMENT PIPELINE     │                       │
│              │  ─ GetSongBPM lookup     │                       │
│              │  ─ Normalize keys→Camelot│                       │
│              │  ─ Infer phase from BPM  │                       │
│              │  ─ Dedupe                │                       │
│              └──────────────┬───────────┘                       │
└─────────────────────────────┼──────────────────────────────────┘
                              ▼
CRATE (your personal database — the source of uniqueness)
┌─────────────────────────────────────────────────────────────────┐
│  Per track:                                                      │
│    title, artist, bpm, key (Camelot), energy (1-10), phase,     │
│    mood, vocal type, label, source, date_added,                 │
│    times_used, last_gig, crowd_rating, personal_tags            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
ENGINE (the scoring brain)
┌─────────────────────────────────────────────────────────────────┐
│  score(track, phase, anchor) =                                   │
│      40 × phase_match                                            │
│    + 20 × bpm_in_phase_range                                     │
│    + 20 × energy_in_phase_range                                  │
│    + 15 × camelot_safe_move_from_anchor                          │
│    +  8 × camelot_energy_boost_from_anchor                       │
│    +  8 × bpm_within_2_of_anchor                                 │
│    +  3 × novelty (less played recently)                         │
│    +  ?  × custom weightings (future: crowd match, venue)        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
BUILDER UI (the interactive layer)
┌─────────────────────────────────────────────────────────────────┐
│  5-phase journey + live energy arc + transition analysis        │
│  Anchor-first workflow                                           │
│  Export: plain text, Rekordbox playlist XML, CSV                │
└─────────────────────────────────────────────────────────────────┘
```

## What's in v2 (ships today)

- **5-phase anchor-first builder** with live energy arc + Camelot-aware transition analysis
- **Crate Manager** with four ingestion paths:
  1. **1001tracklists URL parser** — paste a set URL, the tool fetches the page through a public CORS proxy and extracts tracks from the JSON-LD ItemList (falls back to HTML regex)
  2. **Rekordbox XML import** — upload your collection export, reads BPM + key (auto-converts musical notation to Camelot)
  3. **Manual entry** — with proper phase/mood/vocal tagging
  4. **Seed crate** — 6 starter tracks so it's not empty on first run
- **Recommendation engine** scored on phase fit, Camelot safety, BPM proximity, and novelty
- **In-session persistence** — your crate stays loaded while you work
- **Transition analysis** — flags risky key jumps and >3 BPM gaps
- **Export** — downloadable tracklist with phase structure and anchor marked

## Known limitations of v2 (and what fixes them)

| Limitation | Workaround today | Long-term fix |
|---|---|---|
| Crate doesn't persist across page refreshes | Export and re-import; or leave tab open | Local backend + database, or IndexedDB storage |
| 1001TL parsing relies on public CORS proxies (may rate-limit) | Use Rekordbox XML as primary import | Self-hosted proxy or official partnership |
| Imported 1001TL tracks have no BPM/key | Fill in per-track via edit button after import | Auto-enrich via GetSongBPM API |
| No auto-phase detection on imported tracks | Manually tag phase in Crate view | Use BPM + energy + genre to heuristically assign |
| No rekordbox playlist export | Copy the text export | Generate rekordbox XML playlist format |

## Roadmap beyond v2

### v3 — Persistence & enrichment
- IndexedDB for crate persistence across sessions
- GetSongBPM API integration for auto-BPM/key lookup on manual adds and 1001TL imports
- Rekordbox XML **playlist** export (so you can import the built setlist back into Rekordbox as a playlist)

### v4 — Gig intelligence
- Venue / slot / crowd profiles (warm-up vs peak vs after-hours all need different arcs)
- "Time the set" — assign track durations and see actual timeline (minute 23 peak = too early?)
- Pre/post DJ handoff tool — analyze the previous DJ's last tracks and suggest openers that match

### v5 — Learning from play history
- Log what you actually played at each gig
- Crowd rating per track per gig
- "Tracks that worked last Friday at [venue]" filter
- Surface under-played tracks in your crate (avoid the rinse-repeat trap)

### v6 — Collaborative crates
- Import sets from a list of DJs you follow (auto-ingest their recent 1001TL sets weekly)
- Cross-reference: tracks appearing in 3+ sets by DJs you follow = likely current floor-filler
- "What's moving now" feed tailored to your genre

## Why the anchor-first method is baked into the data model

Every recommendation is scored *relative to the anchor's key and BPM*. This means:

- If your anchor is 128 BPM / 8A, peak-phase recommendations prioritize 126-130 BPM tracks in 7A, 8A, 9A, 8B, or 3A (the +7 boost) — those are the Camelot-safe moves from 8A.
- When you change anchors, every phase's recommendations re-sort. One click refreshes the whole journey.
- This mirrors how real DJs prep: "I'm playing Losing It at peak. What rolls into it? What rolls out?"

## The philosophy

The tool shouldn't pretend to know your vibe. It should make it *effortless* for you to teach it your vibe, then do the mechanical work (key checking, BPM math, arc visualization) so you can focus on the creative work (story, emotion, crowd read).
