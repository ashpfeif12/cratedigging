import { useState, useMemo, useEffect, useRef } from "react";
import { Music, Anchor, Plus, Trash2, Download, TrendingUp, AlertCircle, Sparkles, Edit3, BookOpen, Upload, Link2, Search, X, Database, FileText, Package, Zap, BarChart3, Key, Clipboard, Wand2, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";

// ============ CONSTANTS ============

const PHASES = [
  { id: "invitation", name: "Invitation", color: "#8B7BB8", energyRange: [5, 7], bpmRange: [122, 125], description: "Earn trust. Set the pocket. Groovy, spacious.", position: 0 },
  { id: "build", name: "Build", color: "#6B9BD8", energyRange: [6, 8], bpmRange: [124, 127], description: "Raise stakes. Tighter drums, first hooks.", position: 1 },
  { id: "peak", name: "Peak", color: "#E85D75", energyRange: [8, 10], bpmRange: [126, 130], description: "Your biggest tracks. The payoff.", position: 2 },
  { id: "reset", name: "Reset", color: "#D4A373", energyRange: [7, 8], bpmRange: [124, 127], description: "Release tension. Groovy roller.", position: 3 },
  { id: "sendoff", name: "Send-Off", color: "#7BAE8F", energyRange: [6, 8], bpmRange: [122, 126], description: "The lingering memory. Emotional close.", position: 4 },
];

const STORAGE_KEYS = { crate: "setlist_crate_v2", setlist: "setlist_current_v2" };

// ============ CAMELOT / KEY UTILITIES ============

function getCompatibleKeys(camelot) {
  if (!camelot) return null;
  const match = camelot.match(/^(\d+)([AB])$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const letter = match[2];
  const up = num === 12 ? 1 : num + 1;
  const down = num === 1 ? 12 : num - 1;
  const otherLetter = letter === "A" ? "B" : "A";
  const boost = ((num + 7 - 1) % 12) + 1;
  return {
    same: `${num}${letter}`,
    upOne: `${up}${letter}`,
    downOne: `${down}${letter}`,
    moodFlip: `${num}${otherLetter}`,
    energyBoost: `${boost}${letter}`,
  };
}

function getTransitionQuality(from, to) {
  if (!from || !to) return { rating: "unknown", note: "" };
  const c = getCompatibleKeys(from);
  if (!c) return { rating: "unknown", note: "" };
  if (to === c.same) return { rating: "perfect", note: "Same key — perfect blend" };
  if (to === c.upOne) return { rating: "smooth", note: "+1 step — smooth energy lift" };
  if (to === c.downOne) return { rating: "smooth", note: "-1 step — smooth descent" };
  if (to === c.moodFlip) return { rating: "smooth", note: "Mood flip — minor↔major shift" };
  if (to === c.energyBoost) return { rating: "bold", note: "+7 energy boost — use short blend" };
  return { rating: "risky", note: "Key clash risk — mix quickly or use percussive section" };
}

// Convert musical key notation (e.g. "Am", "F#m", "Cmaj") to Camelot
const KEY_TO_CAMELOT = {
  "Cmaj": "8B", "C": "8B", "Amin": "8A", "Am": "8A",
  "Gmaj": "9B", "G": "9B", "Emin": "9A", "Em": "9A",
  "Dmaj": "10B", "D": "10B", "Bmin": "10A", "Bm": "10A",
  "Amaj": "11B", "A": "11B", "F#min": "11A", "F#m": "11A", "Gbm": "11A",
  "Emaj": "12B", "E": "12B", "C#min": "12A", "C#m": "12A", "Dbm": "12A",
  "Bmaj": "1B", "B": "1B", "G#min": "1A", "G#m": "1A", "Abm": "1A",
  "F#maj": "2B", "F#": "2B", "Gb": "2B", "D#min": "2A", "D#m": "2A", "Ebm": "2A",
  "Dbmaj": "3B", "Db": "3B", "C#": "3B", "Bbmin": "3A", "Bbm": "3A", "A#m": "3A",
  "Abmaj": "4B", "Ab": "4B", "Fmin": "4A", "Fm": "4A",
  "Ebmaj": "5B", "Eb": "5B", "D#": "5B", "Cmin": "5A", "Cm": "5A",
  "Bbmaj": "6B", "Bb": "6B", "A#": "6B", "Gmin": "6A", "Gm": "6A",
  "Fmaj": "7B", "F": "7B", "Dmin": "7A", "Dm": "7A",
};

function normalizeKey(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Already Camelot
  if (/^\d{1,2}[AB]$/i.test(s)) return s.toUpperCase();
  // Musical notation — try lookup
  const cleaned = s.replace(/\s+/g, "").replace(/minor/gi, "min").replace(/major/gi, "maj");
  return KEY_TO_CAMELOT[cleaned] || null;
}

// ============ SEED CRATE (starter data so tool isn't empty on first run) ============

const SEED_CRATE = [
  { id: "seed_1", title: "Pump the Brakes", artist: "Dom Dolla", bpm: 125, key: "11A", energy: 7, phase: "invitation", vocal: "hook", mood: "groovy", label: "Sweat it Out", source: "seed" },
  { id: "seed_2", title: "Miracle Maker", artist: "Dom Dolla & Clementine Douglas", bpm: 126, key: "8A", energy: 8, phase: "build", vocal: "full", mood: "melodic", label: "Three Six Zero", source: "seed" },
  { id: "seed_3", title: "Losing It", artist: "Fisher", bpm: 128, key: "8A", energy: 10, phase: "peak", vocal: "hook", mood: "driving", label: "Dirtybird", source: "seed" },
  { id: "seed_4", title: "Where You Are", artist: "John Summit & Hayla", bpm: 126, key: "7A", energy: 9, phase: "peak", vocal: "full", mood: "euphoric", label: "Experts Only", source: "seed" },
  { id: "seed_5", title: "Body Language", artist: "Patrick Topping", bpm: 126, key: "8A", energy: 7, phase: "reset", vocal: "hook", mood: "groovy", label: "Trick", source: "seed" },
  { id: "seed_6", title: "Music Sounds Better With You", artist: "Stardust", bpm: 123, key: "8B", energy: 7, phase: "sendoff", vocal: "full", mood: "euphoric", label: "Roulé", source: "seed" },
];

// ============ RECOMMENDATION ENGINE ============

function scoreTrack(track, targetPhase, anchorKey, anchorBpm, anchorEnergy) {
  let score = 0;
  if (track.phase === targetPhase) score += 40;
  const phase = PHASES.find(p => p.id === targetPhase);
  if (phase) {
    if (track.bpm >= phase.bpmRange[0] && track.bpm <= phase.bpmRange[1]) score += 20;
    if (track.energy >= phase.energyRange[0] && track.energy <= phase.energyRange[1]) score += 20;
  }
  if (anchorKey) {
    const compat = getCompatibleKeys(anchorKey);
    if (compat && [compat.same, compat.upOne, compat.downOne, compat.moodFlip].includes(track.key)) score += 15;
    else if (compat && track.key === compat.energyBoost) score += 8;
  }
  if (anchorBpm) {
    const diff = Math.abs(track.bpm - anchorBpm);
    if (diff <= 2) score += 8;
    else if (diff <= 4) score += 4;
  }
  // novelty: unplayed or less-played tracks get a small bump so crate stays fresh
  if (!track.timesUsed || track.timesUsed === 0) score += 3;
  return score;
}

function getRecommendations(crate, targetPhase, anchorKey, anchorBpm, anchorEnergy, excludeIds, count = 10) {
  return crate
    .filter(t => !excludeIds.includes(t.id))
    .map(t => ({ ...t, _score: scoreTrack(t, targetPhase, anchorKey, anchorBpm, anchorEnergy) }))
    .filter(t => t._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, count);
}

// ============ 1001TRACKLISTS URL PARSER ============
// Parses tracklist HTML via a CORS proxy. Extracts title/artist pairs.
// Users can paste any 1001tracklists URL and import the tracks.

async function parse1001tracklistsURL(url) {
  // Try multiple CORS proxies (public, may rate-limit)
  const proxies = [
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  let html = null;
  let lastErr = null;
  for (const mkUrl of proxies) {
    try {
      const resp = await fetch(mkUrl(url), { method: "GET" });
      if (resp.ok) { html = await resp.text(); break; }
      lastErr = new Error(`Proxy returned ${resp.status}`);
    } catch (e) { lastErr = e; }
  }
  if (!html) throw new Error("Could not fetch tracklist (CORS proxies unavailable). " + (lastErr?.message || ""));

  const tracks = [];
  // Strategy 1: parse JSON-LD structured data (most 1001tl pages have ItemList)
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "ItemList" && Array.isArray(item.itemListElement)) {
          for (const el of item.itemListElement) {
            const name = el?.item?.name || el?.name;
            if (name && typeof name === "string") {
              const parsed = parseTrackString(name);
              if (parsed) tracks.push(parsed);
            }
          }
        }
      }
    } catch (e) { /* skip bad blocks */ }
  }

  // Strategy 2: regex-scrape track rows if JSON-LD didn't yield
  if (tracks.length === 0) {
    // Look for "Artist - Title" patterns in anchor text that looks like a track row
    const rowMatches = [...html.matchAll(/<meta[^>]*itemprop=["']name["'][^>]*content=["']([^"']+)["']/gi)];
    for (const m of rowMatches) {
      const parsed = parseTrackString(m[1]);
      if (parsed) tracks.push(parsed);
    }
  }

  // Dedupe
  const seen = new Set();
  const unique = [];
  for (const t of tracks) {
    const k = `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`;
    if (!seen.has(k)) { seen.add(k); unique.push(t); }
  }

  return unique;
}

function parseTrackString(s) {
  if (!s || s.length < 3) return null;
  // "Artist - Title" or "Artist – Title"
  const m = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (!m) return null;
  const artist = m[1].trim();
  const title = m[2].trim();
  if (artist.length < 1 || title.length < 1) return null;
  if (/^ID$/i.test(artist) || /^ID$/i.test(title)) return null;
  return { artist, title };
}

// ============ GETSONGBPM API ENRICHMENT ============
// Free API - user registers at getsongbpm.com/api for an API key.
// Returns tempo (BPM), key_of (musical key), open_key (Camelot).
// Rate limit: 3000 requests/hour per key. We stay well under with 1300ms spacing.
// Auth: X-API-KEY header (preferred over URL param — keys shouldn't live in URLs).
// CORS: the API doesn't send CORS headers, so we route via public proxy.
// Attribution: a backlink to getsongbpm.com is MANDATORY (footer + Settings tab).

async function enrichTrackViaGetSongBPM(track, apiKey) {
  if (!apiKey) throw new Error("GetSongBPM API key required. Register free at getsongbpm.com/api");
  // Step 1: search for the song
  const query = `song:${track.title} artist:${track.artist}`;
  const searchUrl = `https://api.getsong.co/search/?type=both&lookup=${encodeURIComponent(query)}`;
  // Use allorigins proxy (supports custom headers via the "raw" passthrough variant).
  // We fall back to corsproxy.io which also forwards headers.
  const proxies = [
    (u) => ({ url: `https://corsproxy.io/?${encodeURIComponent(u)}`, headers: { "X-API-KEY": apiKey } }),
    // Fallback: if header-forwarding proxy fails, send key in URL param (less ideal but functional)
    (u) => ({ url: `https://corsproxy.io/?${encodeURIComponent(u + `&api_key=${encodeURIComponent(apiKey)}`)}`, headers: {} }),
  ];

  let lastErr = null;
  for (const mk of proxies) {
    const { url, headers } = mk(searchUrl);
    try {
      const resp = await fetch(url, { method: "GET", headers });
      if (resp.status === 429) throw new Error("Rate limit hit (3000/hr). Wait an hour or slow down.");
      if (resp.status === 401 || resp.status === 403) throw new Error("Invalid or suspended API key. Check Settings.");
      if (!resp.ok) { lastErr = new Error(`GetSongBPM returned ${resp.status}`); continue; }
      const data = await resp.json();
      const first = data?.search?.[0];
      if (!first) return { found: false };
      const tempo = first.tempo ? parseInt(first.tempo) : null;
      const openKey = first.open_key || null; // e.g. "1m" or "8d"
      const camelot = convertOpenKeyToCamelot(openKey);
      return {
        found: true,
        bpm: tempo,
        key: camelot,
        keyRaw: first.key_of,
        danceability: first.danceability,
        acousticness: first.acousticness,
      };
    } catch (e) {
      // Re-throw auth/rate errors; keep trying other proxies for network issues
      if (e.message.includes("Rate limit") || e.message.includes("API key")) throw e;
      lastErr = e;
    }
  }
  throw new Error(`Lookup failed: ${lastErr?.message || "no proxy available"}`);
}

// GetSongBPM uses "OpenKey" notation: 1m-12m (minor) / 1d-12d (major). Convert to Camelot.
// OpenKey ↔ Camelot: same number, m → A, d → B.
function convertOpenKeyToCamelot(openKey) {
  if (!openKey) return null;
  const m = openKey.match(/^(\d+)([md])$/i);
  if (!m) return null;
  const num = parseInt(m[1]);
  const letter = m[2].toLowerCase() === "m" ? "A" : "B";
  return `${num}${letter}`;
}

// ============ BEATPORT CHART PARSER ============
// User copy-pastes text from a Beatport chart page. We extract tracks.
// Beatport chart pages tend to have repeating patterns: "1\nTitle\nArtist\n..."
// or "Title - Artist" lines. We try several extraction strategies.

function parseBeatportPaste(text) {
  if (!text) return [];
  const tracks = [];

  // Strategy 1: "Title - Artist" or "Artist - Title" lines
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Detect ranking lines (pure numbers like "1", "2", "#1")
  const isRankLine = (l) => /^#?\d+\.?$/.test(l);

  // Strategy A: look for groups like [rank]\n[title]\n[artist]\n[label]\n...
  // Walk through lines, looking for a rank followed by 2+ text lines
  for (let i = 0; i < lines.length; i++) {
    if (isRankLine(lines[i]) && lines[i + 1] && lines[i + 2] && !isRankLine(lines[i + 1])) {
      const title = lines[i + 1];
      const artist = lines[i + 2];
      // Skip if artist line looks like a label or BPM
      if (!title || !artist) continue;
      if (/^\d+\s*bpm/i.test(artist)) continue;
      if (title.length < 2 || artist.length < 2) continue;
      tracks.push({ title, artist });
    }
  }

  // Strategy B: if A found nothing, try "Title - Artist" pattern
  if (tracks.length === 0) {
    for (const line of lines) {
      const m = line.match(/^(.+?)\s+[-–—]\s+(.+)$/);
      if (m) {
        const a = m[1].trim();
        const b = m[2].trim();
        if (a.length < 2 || b.length < 2) continue;
        if (isRankLine(a) || isRankLine(b)) continue;
        // Heuristic: Beatport often formats as "Track Title - Artist(s)"
        tracks.push({ title: a, artist: b });
      }
    }
  }

  // Dedupe
  const seen = new Set();
  return tracks.filter(t => {
    const k = `${t.title.toLowerCase()}|${t.artist.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ============ SET ANALYZER ============
// Takes a list of tracks (already parsed/imported) and analyzes the set's shape.
// Returns BPM curve, key progression, tight sequences, peak position estimate.

function analyzeSet(tracks) {
  if (!tracks || tracks.length < 2) return null;

  const n = tracks.length;
  const withBpm = tracks.filter(t => t.bpm);
  const withKey = tracks.filter(t => t.key);

  // BPM statistics
  const bpmStats = withBpm.length > 0 ? {
    min: Math.min(...withBpm.map(t => t.bpm)),
    max: Math.max(...withBpm.map(t => t.bpm)),
    avg: withBpm.reduce((s, t) => s + t.bpm, 0) / withBpm.length,
    peakAt: withBpm.reduce((best, t, i) => t.bpm > (best?.bpm ?? 0) ? { bpm: t.bpm, idx: tracks.indexOf(t), title: t.title } : best, null),
  } : null;

  // Key progression — map each key to Camelot position for visualization
  const keyProgression = tracks.map((t, i) => ({
    idx: i,
    title: t.title,
    key: t.key || null,
    bpm: t.bpm || null,
  }));

  // Tight sequences — runs of 2+ consecutive tracks that share Camelot compatibility
  const tightSequences = [];
  let currentRun = [];
  for (let i = 0; i < tracks.length; i++) {
    if (i === 0) { currentRun = [i]; continue; }
    const prev = tracks[i - 1];
    const curr = tracks[i];
    const q = getTransitionQuality(prev.key, curr.key);
    if (["perfect", "smooth"].includes(q.rating)) {
      currentRun.push(i);
    } else {
      if (currentRun.length >= 3) tightSequences.push([...currentRun]);
      currentRun = [i];
    }
  }
  if (currentRun.length >= 3) tightSequences.push(currentRun);

  // Transition analysis
  const transitions = [];
  for (let i = 1; i < tracks.length; i++) {
    const prev = tracks[i - 1];
    const curr = tracks[i];
    transitions.push({
      from: i - 1,
      to: i,
      quality: getTransitionQuality(prev.key, curr.key),
      bpmDiff: (curr.bpm || 0) - (prev.bpm || 0),
    });
  }

  // Peak position as % of set length (where is the fastest track?)
  const peakPct = bpmStats?.peakAt ? (bpmStats.peakAt.idx / Math.max(1, n - 1)) * 100 : null;

  // Opener pattern — first 5 tracks' avg BPM vs overall
  const openerAvg = withBpm.slice(0, 5).reduce((s, t) => s + t.bpm, 0) / Math.min(5, withBpm.length) || 0;
  const opener = {
    count: Math.min(5, tracks.length),
    avgBpm: openerAvg ? openerAvg.toFixed(1) : "—",
    tracks: tracks.slice(0, 5),
  };

  return {
    trackCount: n,
    withBpmCount: withBpm.length,
    withKeyCount: withKey.length,
    bpmStats,
    keyProgression,
    tightSequences,
    transitions,
    peakPct,
    opener,
  };
}

// ============ REKORDBOX XML PARSER ============

function parseRekordboxXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Invalid Rekordbox XML");
  const tracks = [];
  const trackNodes = doc.querySelectorAll("COLLECTION > TRACK");
  trackNodes.forEach(node => {
    const title = node.getAttribute("Name") || "";
    const artist = node.getAttribute("Artist") || "";
    const bpmRaw = node.getAttribute("AverageBpm");
    const keyRaw = node.getAttribute("Tonality") || "";
    const genre = node.getAttribute("Genre") || "";
    const label = node.getAttribute("Label") || "";
    if (!title || !artist) return;
    const bpm = bpmRaw ? Math.round(parseFloat(bpmRaw)) : null;
    const key = normalizeKey(keyRaw);
    tracks.push({
      title, artist, bpm, key,
      energy: null, phase: null, vocal: null, mood: null, label, genre,
      source: "rekordbox",
    });
  });
  return tracks;
}

// ============ STORAGE (in-memory only; Claude artifacts don't support localStorage) ============

// ============ UI COMPONENTS ============

function EnergyArc({ tracks }) {
  if (tracks.length === 0) return null;
  const width = 100, height = 100;
  const validTracks = tracks.filter(t => t.energy != null);
  if (validTracks.length === 0) return null;
  const points = validTracks.map((t, i) => {
    const x = validTracks.length === 1 ? 50 : (i / (validTracks.length - 1)) * width;
    const y = height - (t.energy / 10) * height;
    return { x, y };
  });
  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  return (
    <div className="relative w-full h-24 rounded-lg overflow-hidden" style={{ background: "rgba(20, 18, 32, 0.6)" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#6B9BD8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#E85D75" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`} fill="url(#arcGrad)" />
        <path d={pathD} stroke="#E85D75" strokeWidth="0.8" fill="none" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="1.2" fill="#fff" vectorEffect="non-scaling-stroke" />))}
      </svg>
      <div className="absolute top-1 right-2 text-[10px] tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>energy arc</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
      <div className="text-sm font-bold" style={{ color: "#F5F1E8" }}>{value}</div>
    </div>
  );
}

// ============ CRATE MANAGER MODAL ============

function CrateManager({ crate, onClose, onAddTracks, onUpdateTrack, onDeleteTrack, apiKey, onApiKeyChange }) {
  const [tab, setTab] = useState("view"); // view | import-url | import-beatport | import-xml | import-manual | settings
  const [urlInput, setUrlInput] = useState("");
  const [urlStatus, setUrlStatus] = useState(null);
  const [urlPending, setUrlPending] = useState([]);
  const [urlAnalysis, setUrlAnalysis] = useState(null); // set-level analysis after parse
  const [xmlStatus, setXmlStatus] = useState(null);
  const [beatportText, setBeatportText] = useState("");
  const [beatportPending, setBeatportPending] = useState([]);
  const [beatportStatus, setBeatportStatus] = useState(null);
  const [manual, setManual] = useState({ title: "", artist: "", bpm: "", key: "", energy: "", phase: "build", vocal: "instrumental", mood: "groovy", label: "" });
  const [search, setSearch] = useState("");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState(new Set());
  const [enrichStatus, setEnrichStatus] = useState(null);
  const fileInputRef = useRef(null);

  const filteredCrate = useMemo(() => {
    return crate.filter(t => {
      if (filterPhase !== "all" && t.phase !== filterPhase) return false;
      if (filterIncomplete && t.bpm && t.key && t.energy && t.phase) return false;
      if (search) {
        const s = search.toLowerCase();
        return t.title.toLowerCase().includes(s) || t.artist.toLowerCase().includes(s) || (t.label || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [crate, search, filterPhase, filterIncomplete]);

  // Enrich a single track via GetSongBPM API
  const enrichOne = async (track) => {
    if (!apiKey) { setEnrichStatus({ type: "error", msg: "Set your GetSongBPM API key in Settings first." }); return; }
    setEnrichingIds(prev => new Set([...prev, track.id]));
    try {
      const result = await enrichTrackViaGetSongBPM(track, apiKey);
      if (!result.found) {
        setEnrichStatus({ type: "warn", msg: `No match found on GetSongBPM for "${track.title}"` });
      } else {
        onUpdateTrack({
          ...track,
          bpm: track.bpm || result.bpm,
          key: track.key || result.key,
        });
        setEnrichStatus({ type: "success", msg: `Updated "${track.title}" — ${result.bpm} BPM, ${result.key}` });
      }
    } catch (e) {
      setEnrichStatus({ type: "error", msg: e.message });
    } finally {
      setEnrichingIds(prev => { const s = new Set(prev); s.delete(track.id); return s; });
    }
  };

  // Enrich all missing-data tracks (one at a time, rate-limited)
  // GetSongBPM limit: 3000/hr. We pace at 1300ms (~2770/hr) to stay safely under.
  const enrichAllMissing = async () => {
    if (!apiKey) { setEnrichStatus({ type: "error", msg: "Set your GetSongBPM API key in Settings first." }); return; }
    const missing = crate.filter(t => !t.bpm || !t.key);
    if (missing.length === 0) { setEnrichStatus({ type: "info", msg: "No tracks missing BPM/key." }); return; }
    const estSecs = Math.ceil(missing.length * 1.3);
    setEnrichStatus({ type: "info", msg: `Enriching ${missing.length} tracks (~${estSecs}s). Rate-limited to stay under 3000/hr.` });
    let updated = 0, notFound = 0, errored = 0, stopped = false;
    for (let i = 0; i < missing.length; i++) {
      const t = missing[i];
      try {
        const result = await enrichTrackViaGetSongBPM(t, apiKey);
        if (result.found) {
          onUpdateTrack({ ...t, bpm: t.bpm || result.bpm, key: t.key || result.key });
          updated++;
        } else { notFound++; }
      } catch (e) {
        errored++;
        // Stop on auth/rate errors — no point hammering
        if (e.message.includes("Rate limit") || e.message.includes("API key")) {
          setEnrichStatus({ type: "error", msg: `Stopped at track ${i + 1}/${missing.length}: ${e.message}` });
          stopped = true;
          break;
        }
      }
      // Live progress update every 5 tracks
      if (i > 0 && i % 5 === 0) {
        setEnrichStatus({ type: "info", msg: `Enriching... ${i}/${missing.length} done (${updated} updated, ${notFound} not found)` });
      }
      // Rate limit: 1300ms between calls
      await new Promise(r => setTimeout(r, 1300));
    }
    if (!stopped) {
      setEnrichStatus({ type: "success", msg: `✓ Enriched ${updated}. ${notFound} not found. ${errored} errors.` });
    }
  };

  const handleUrlParse = async () => {
    setUrlStatus("loading");
    setUrlAnalysis(null);
    try {
      const tracks = await parse1001tracklistsURL(urlInput);
      if (tracks.length === 0) { setUrlStatus({ type: "error", msg: "No tracks found. The tracklist may be private, region-locked, or the page structure changed." }); return; }
      const pending = tracks.map((t, i) => ({ ...t, _selected: true, _idx: i, bpm: null, key: null, energy: null, phase: "build", vocal: "instrumental", mood: "groovy", label: "", source: "1001tl" }));
      setUrlPending(pending);
      // Run set analysis (will mostly be skeletal until tracks are enriched)
      setUrlAnalysis(analyzeSet(tracks));
      setUrlStatus({ type: "success", msg: `Found ${tracks.length} tracks. Review & import below — or run GetSongBPM enrichment after import to unlock the full analysis.` });
    } catch (e) {
      setUrlStatus({ type: "error", msg: e.message });
    }
  };

  const handleBeatportParse = () => {
    const tracks = parseBeatportPaste(beatportText);
    if (tracks.length === 0) {
      setBeatportStatus({ type: "error", msg: "No tracks extracted. Tip: paste the raw text from the chart page — the parser looks for either ranked lists or 'Title - Artist' lines." });
      return;
    }
    setBeatportPending(tracks.map((t, i) => ({ ...t, _selected: true, _idx: i, bpm: null, key: null, energy: null, phase: "peak", vocal: "instrumental", mood: "driving", label: "", source: "beatport" })));
    setBeatportStatus({ type: "success", msg: `Extracted ${tracks.length} tracks.` });
  };

  const importBeatportSelected = () => {
    const toImport = beatportPending.filter(t => t._selected).map(t => {
      const { _selected, _idx, ...clean } = t;
      return clean;
    });
    onAddTracks(toImport);
    setBeatportPending([]);
    setBeatportText("");
    setBeatportStatus({ type: "success", msg: `Imported ${toImport.length} tracks. Run enrichment to fill BPM/key.` });
  };

  const handleXmlUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const tracks = parseRekordboxXML(evt.target.result);
        if (tracks.length === 0) { setXmlStatus({ type: "error", msg: "No tracks found in XML." }); return; }
        onAddTracks(tracks);
        setXmlStatus({ type: "success", msg: `Imported ${tracks.length} tracks from Rekordbox. Energy & phase tags need to be set manually per track.` });
      } catch (err) {
        setXmlStatus({ type: "error", msg: err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleManualAdd = () => {
    if (!manual.title || !manual.artist) return;
    const track = {
      title: manual.title.trim(),
      artist: manual.artist.trim(),
      bpm: manual.bpm ? parseInt(manual.bpm) : null,
      key: manual.key ? normalizeKey(manual.key) || manual.key.toUpperCase() : null,
      energy: manual.energy ? parseInt(manual.energy) : null,
      phase: manual.phase,
      vocal: manual.vocal,
      mood: manual.mood,
      label: manual.label,
      source: "manual",
    };
    onAddTracks([track]);
    setManual({ title: "", artist: "", bpm: "", key: "", energy: "", phase: "build", vocal: "instrumental", mood: "groovy", label: "" });
  };

  const importSelected = () => {
    const toImport = urlPending.filter(t => t._selected).map(t => {
      const { _selected, _idx, ...clean } = t;
      return clean;
    });
    onAddTracks(toImport);
    setUrlPending([]);
    setUrlInput("");
    setUrlStatus({ type: "success", msg: `Imported ${toImport.length} tracks. Fill in BPM/key/energy from Rekordbox analysis.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg overflow-hidden flex flex-col" style={{ background: "#0f0c18", border: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <Database size={18} style={{ color: "#E85D75" }} />
            <h2 className="display-font text-2xl italic" style={{ color: "#F5F1E8" }}>Your Crate</h2>
            <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(232,93,117,0.15)", color: "#E85D75" }}>{crate.length} tracks</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10"><X size={18} style={{ color: "rgba(255,255,255,0.6)" }} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {[
            { id: "view", label: "Crate", icon: Database },
            { id: "import-url", label: "From 1001TL", icon: Link2 },
            { id: "import-beatport", label: "Beatport Paste", icon: Clipboard },
            { id: "import-xml", label: "Rekordbox", icon: Upload },
            { id: "import-manual", label: "Manual", icon: Plus },
            { id: "settings", label: "API Key", icon: Key },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider transition-all"
              style={{
                background: tab === t.id ? "rgba(232,93,117,0.1)" : "transparent",
                color: tab === t.id ? "#E85D75" : "rgba(255,255,255,0.5)",
                borderBottom: tab === t.id ? "2px solid #E85D75" : "2px solid transparent",
              }}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "view" && (
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, artist, label..."
                    className="w-full pl-8 pr-3 py-2 text-sm rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
                <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)}
                  className="px-3 py-2 text-xs rounded uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="all">All phases</option>
                  {PHASES.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  <option value="">Untagged</option>
                </select>
                <button onClick={() => setFilterIncomplete(!filterIncomplete)}
                  className="px-3 py-2 text-xs rounded uppercase tracking-wider flex items-center gap-1"
                  style={{ background: filterIncomplete ? "rgba(212,163,115,0.2)" : "rgba(255,255,255,0.04)", color: filterIncomplete ? "#D4A373" : "rgba(255,255,255,0.6)", border: `1px solid ${filterIncomplete ? "rgba(212,163,115,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                  <AlertCircle size={11} /> Incomplete
                </button>
                <button onClick={enrichAllMissing}
                  disabled={!apiKey}
                  className="px-3 py-2 text-xs rounded uppercase tracking-wider flex items-center gap-1 disabled:opacity-40"
                  style={{ background: "rgba(123,174,143,0.15)", color: "#7BAE8F", border: "1px solid rgba(123,174,143,0.3)" }}
                  title={apiKey ? "Auto-fill missing BPM/key via GetSongBPM" : "Set API key first"}>
                  <Wand2 size={11} /> Enrich all
                </button>
              </div>
              {enrichStatus && (
                <div className="mb-3 p-2 rounded text-xs flex items-center gap-2" style={{
                  background: enrichStatus.type === "error" ? "rgba(232,93,117,0.1)" : enrichStatus.type === "success" ? "rgba(123,174,143,0.1)" : "rgba(212,163,115,0.1)",
                  color: enrichStatus.type === "error" ? "#E85D75" : enrichStatus.type === "success" ? "#7BAE8F" : "#D4A373",
                }}>
                  {enrichStatus.msg}
                </div>
              )}
              {filteredCrate.length === 0 ? (
                <div className="text-center py-12 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {crate.length === 0 ? "Your crate is empty. Import from 1001tracklists, Beatport, Rekordbox, or add tracks manually." : "No matches."}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCrate.map(t => (
                    <CrateRow key={t.id} track={t} onUpdate={onUpdateTrack} onDelete={onDeleteTrack} onEnrich={enrichOne} apiKey={apiKey} enriching={enrichingIds.has(t.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "import-url" && (
            <div>
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                Paste a 1001tracklists URL (e.g. a set by a DJ in your lane). The tool parses the tracklist so you can import tracks into your crate.
              </p>
              <div className="flex gap-2 mb-3">
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://www.1001tracklists.com/tracklist/..."
                  className="flex-1 px-3 py-2 text-sm rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }} />
                <button onClick={handleUrlParse} disabled={!urlInput || urlStatus === "loading"}
                  className="px-4 py-2 text-xs uppercase tracking-wider rounded disabled:opacity-30" style={{ background: "#E85D75", color: "#0a0812", fontWeight: 700 }}>
                  {urlStatus === "loading" ? "Parsing..." : "Parse URL"}
                </button>
              </div>
              {urlStatus?.type === "error" && (
                <div className="p-3 rounded text-xs mb-3" style={{ background: "rgba(232,93,117,0.1)", color: "#E85D75" }}>
                  <AlertCircle size={12} className="inline mr-1" /> {urlStatus.msg}
                  <div className="mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Fallback: copy-paste "Artist - Title" lines into the manual tab below, or try a different set URL.
                  </div>
                </div>
              )}
              {urlStatus?.type === "success" && urlPending.length === 0 && (
                <div className="p-3 rounded text-xs" style={{ background: "rgba(123,174,143,0.1)", color: "#7BAE8F" }}>✓ {urlStatus.msg}</div>
              )}
              {urlPending.length > 0 && (
                <div>
                  {urlAnalysis && (
                    <div className="mb-4 p-3 rounded" style={{ background: "rgba(107,155,216,0.08)", border: "1px solid rgba(107,155,216,0.25)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={12} style={{ color: "#6B9BD8" }} />
                        <h5 className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: "#6B9BD8" }}>Set Study</h5>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-[10px]">
                        <div><div style={{ color: "rgba(255,255,255,0.4)" }}>Tracks</div><div style={{ color: "#F5F1E8", fontWeight: 700 }}>{urlAnalysis.trackCount}</div></div>
                        <div><div style={{ color: "rgba(255,255,255,0.4)" }}>Opener (first 5)</div><div style={{ color: "#F5F1E8", fontWeight: 700 }}>{urlAnalysis.opener.count} tracks</div></div>
                        <div><div style={{ color: "rgba(255,255,255,0.4)" }}>Peak position</div><div style={{ color: "#F5F1E8", fontWeight: 700 }}>{urlAnalysis.peakPct != null ? `${Math.round(urlAnalysis.peakPct)}%` : "—"}</div></div>
                      </div>
                      <p className="text-[10px] mt-2 italic" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Note their opener formula & where the set peaks. Import, enrich, and the full BPM/key arc will fill in.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {urlPending.filter(t => t._selected).length} of {urlPending.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setUrlPending(p => p.map(t => ({ ...t, _selected: true })))} className="text-[10px] uppercase tracking-wider" style={{ color: "#E85D75" }}>select all</button>
                      <button onClick={() => setUrlPending(p => p.map(t => ({ ...t, _selected: false })))} className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>none</button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 mb-3">
                    {urlPending.map((t, i) => (
                      <label key={i} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-white/5" style={{ background: "rgba(255,255,255,0.015)" }}>
                        <input type="checkbox" checked={t._selected} onChange={e => setUrlPending(p => p.map((x, j) => j === i ? { ...x, _selected: e.target.checked } : x))} />
                        <span className="text-[9px] tabular-nums w-6" style={{ color: "rgba(255,255,255,0.3)" }}>{String(i + 1).padStart(2, "0")}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate" style={{ color: "#F5F1E8" }}>{t.title}</div>
                          <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{t.artist}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={importSelected} className="px-4 py-2 text-xs uppercase tracking-wider rounded" style={{ background: "#E85D75", color: "#0a0812", fontWeight: 700 }}>
                    Import {urlPending.filter(t => t._selected).length} tracks
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "import-beatport" && (
            <div>
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                Open a Beatport chart page (e.g. <span style={{ color: "#F5F1E8" }}>beatport.com/genre/tech-house/top-100</span>), select all, copy, and paste below. The parser handles Beatport's standard chart format.
              </p>
              <textarea value={beatportText} onChange={e => setBeatportText(e.target.value)} placeholder="Paste Beatport chart text here..."
                className="w-full p-3 text-xs rounded mb-3 font-mono" rows={8}
                style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }} />
              <div className="flex gap-2 mb-3">
                <button onClick={handleBeatportParse} disabled={!beatportText}
                  className="px-4 py-2 text-xs uppercase tracking-wider rounded disabled:opacity-30" style={{ background: "#E85D75", color: "#0a0812", fontWeight: 700 }}>
                  Parse paste
                </button>
                <button onClick={() => { setBeatportText(""); setBeatportPending([]); setBeatportStatus(null); }}
                  className="px-4 py-2 text-xs uppercase tracking-wider rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                  Clear
                </button>
              </div>
              {beatportStatus?.type === "error" && (
                <div className="p-3 rounded text-xs mb-3" style={{ background: "rgba(232,93,117,0.1)", color: "#E85D75" }}>
                  <AlertCircle size={12} className="inline mr-1" /> {beatportStatus.msg}
                </div>
              )}
              {beatportStatus?.type === "success" && beatportPending.length === 0 && (
                <div className="p-3 rounded text-xs" style={{ background: "rgba(123,174,143,0.1)", color: "#7BAE8F" }}>✓ {beatportStatus.msg}</div>
              )}
              {beatportPending.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {beatportPending.filter(t => t._selected).length} of {beatportPending.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setBeatportPending(p => p.map(t => ({ ...t, _selected: true })))} className="text-[10px] uppercase tracking-wider" style={{ color: "#E85D75" }}>select all</button>
                      <button onClick={() => setBeatportPending(p => p.map(t => ({ ...t, _selected: false })))} className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>none</button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 mb-3">
                    {beatportPending.map((t, i) => (
                      <label key={i} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-white/5" style={{ background: "rgba(255,255,255,0.015)" }}>
                        <input type="checkbox" checked={t._selected} onChange={e => setBeatportPending(p => p.map((x, j) => j === i ? { ...x, _selected: e.target.checked } : x))} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate" style={{ color: "#F5F1E8" }}>{t.title}</div>
                          <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{t.artist}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={importBeatportSelected} className="px-4 py-2 text-xs uppercase tracking-wider rounded" style={{ background: "#E85D75", color: "#0a0812", fontWeight: 700 }}>
                    Import {beatportPending.filter(t => t._selected).length} tracks
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={14} style={{ color: "#E85D75" }} />
                  <h3 className="text-sm font-bold" style={{ color: "#F5F1E8" }}>GetSongBPM API Key</h3>
                </div>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                  GetSongBPM provides free BPM, key, and Camelot data for millions of tracks. The Architect uses it to auto-fill metadata for tracks you import without BPM/key.
                </p>
                <ol className="text-xs space-y-1 mb-3 pl-4" style={{ color: "rgba(255,255,255,0.55)", listStyle: "decimal" }}>
                  <li>Register for a free API key at <a href="https://getsongbpm.com/api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: "#E85D75" }}>getsongbpm.com/api <ExternalLink size={10} /></a></li>
                  <li>The API is free but requires a backlink to getsongbpm.com somewhere in your project (already included in this tool's footer).</li>
                  <li>Paste your key below. It stays in this browser session only.</li>
                </ol>
                <input type="text" value={apiKey} onChange={e => onApiKeyChange(e.target.value)} placeholder="Paste your GetSongBPM API key..."
                  className="w-full px-3 py-2 text-sm rounded font-mono" style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }} />
                {apiKey && (
                  <div className="mt-2 text-[10px] flex items-center gap-1" style={{ color: "#7BAE8F" }}>
                    <CheckCircle2 size={10} /> Key set. Use "Enrich all" in the Crate tab or the wand icon on individual tracks.
                  </div>
                )}
              </div>
              <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Attribution (required)</h4>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Tempo and Camelot key data powered by <a href="https://getsongbpm.com" target="_blank" rel="noopener noreferrer" style={{ color: "#E85D75" }}>GetSongBPM.com</a>
                </p>
              </div>
            </div>
          )}

          {tab === "import-xml" && (
            <div>
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                In Rekordbox: <span style={{ color: "#F5F1E8" }}>File → Export Collection in xml format</span>. Upload the resulting .xml file here to import your entire library with actual BPM and key values.
              </p>
              <input ref={fileInputRef} type="file" accept=".xml" onChange={handleXmlUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 rounded text-sm flex flex-col items-center gap-2 transition-all hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(232,93,117,0.4)", color: "rgba(255,255,255,0.7)" }}>
                <Upload size={24} style={{ color: "#E85D75" }} />
                <span>Click to upload rekordbox.xml</span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Your file stays in the browser. Nothing is uploaded to a server.</span>
              </button>
              {xmlStatus && (
                <div className="mt-3 p-3 rounded text-xs" style={{
                  background: xmlStatus.type === "error" ? "rgba(232,93,117,0.1)" : "rgba(123,174,143,0.1)",
                  color: xmlStatus.type === "error" ? "#E85D75" : "#7BAE8F"
                }}>
                  {xmlStatus.type === "error" ? <AlertCircle size={12} className="inline mr-1" /> : "✓ "}{xmlStatus.msg}
                </div>
              )}
            </div>
          )}

          {tab === "import-manual" && (
            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="Title *" value={manual.title} onChange={v => setManual({ ...manual, title: v })} />
              <FieldInput label="Artist *" value={manual.artist} onChange={v => setManual({ ...manual, artist: v })} />
              <FieldInput label="BPM" value={manual.bpm} onChange={v => setManual({ ...manual, bpm: v })} placeholder="e.g. 126" />
              <FieldInput label="Key (Camelot or musical)" value={manual.key} onChange={v => setManual({ ...manual, key: v })} placeholder="e.g. 8A or Am" />
              <FieldInput label="Energy (1-10)" value={manual.energy} onChange={v => setManual({ ...manual, energy: v })} placeholder="e.g. 8" />
              <FieldInput label="Label" value={manual.label} onChange={v => setManual({ ...manual, label: v })} />
              <FieldSelect label="Phase" value={manual.phase} onChange={v => setManual({ ...manual, phase: v })} options={PHASES.map(p => ({ value: p.id, label: p.name }))} />
              <FieldSelect label="Vocal" value={manual.vocal} onChange={v => setManual({ ...manual, vocal: v })} options={[
                { value: "instrumental", label: "Instrumental" }, { value: "hook", label: "Hook" }, { value: "full", label: "Full Vocal" },
              ]} />
              <FieldSelect label="Mood" value={manual.mood} onChange={v => setManual({ ...manual, mood: v })} options={[
                { value: "groovy", label: "Groovy" }, { value: "driving", label: "Driving" }, { value: "euphoric", label: "Euphoric" },
                { value: "melodic", label: "Melodic" }, { value: "dark", label: "Dark" }, { value: "funky", label: "Funky" },
              ]} />
              <div className="col-span-2">
                <button onClick={handleManualAdd} disabled={!manual.title || !manual.artist}
                  className="w-full py-2 text-xs uppercase tracking-wider rounded disabled:opacity-30" style={{ background: "#E85D75", color: "#0a0812", fontWeight: 700 }}>
                  Add to crate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[9px] uppercase tracking-[0.2em] block mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }} />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-[9px] uppercase tracking-[0.2em] block mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }}>
        {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );
}

function CrateRow({ track, onUpdate, onDelete, onEnrich, apiKey, enriching }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(track);

  useEffect(() => { setDraft(track); }, [track]);

  const save = () => {
    const cleaned = {
      ...draft,
      bpm: draft.bpm ? parseInt(draft.bpm) : null,
      key: draft.key ? normalizeKey(draft.key) || draft.key.toUpperCase() : null,
      energy: draft.energy ? parseInt(draft.energy) : null,
    };
    onUpdate(cleaned);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 rounded space-y-2" style={{ background: "rgba(232,93,117,0.08)", border: "1px solid rgba(232,93,117,0.3)" }}>
        <div className="grid grid-cols-2 gap-2">
          <FieldInput label="Title" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} />
          <FieldInput label="Artist" value={draft.artist} onChange={v => setDraft({ ...draft, artist: v })} />
          <FieldInput label="BPM" value={draft.bpm || ""} onChange={v => setDraft({ ...draft, bpm: v })} />
          <FieldInput label="Key" value={draft.key || ""} onChange={v => setDraft({ ...draft, key: v })} />
          <FieldInput label="Energy" value={draft.energy || ""} onChange={v => setDraft({ ...draft, energy: v })} />
          <FieldSelect label="Phase" value={draft.phase || "build"} onChange={v => setDraft({ ...draft, phase: v })} options={PHASES.map(p => ({ value: p.id, label: p.name }))} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="px-3 py-1 text-[10px] uppercase rounded" style={{ background: "#E85D75", color: "#0a0812", fontWeight: 700 }}>Save</button>
          <button onClick={() => { setDraft(track); setEditing(false); }} className="px-3 py-1 text-[10px] uppercase rounded" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const missing = !track.bpm || !track.key || !track.energy || !track.phase;
  const missingCore = !track.bpm || !track.key;
  return (
    <div className="group flex items-center gap-3 p-2 rounded" style={{ background: missing ? "rgba(212,163,115,0.06)" : "rgba(255,255,255,0.02)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate" style={{ color: "#F5F1E8" }}>{track.title}</div>
        <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{track.artist}{track.label ? ` · ${track.label}` : ""}</div>
      </div>
      <div className="flex gap-2 text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
        <span className={track.bpm ? "" : "opacity-40"}>{track.bpm || "—"}</span>
        <span className={track.key ? "" : "opacity-40"}>{track.key || "—"}</span>
        <span className={track.energy ? "" : "opacity-40"}>E{track.energy || "—"}</span>
        <span className={track.phase ? "" : "opacity-40"} style={{ color: track.phase ? PHASES.find(p => p.id === track.phase)?.color : "inherit" }}>
          {track.phase ? PHASES.find(p => p.id === track.phase)?.name?.slice(0, 3).toLowerCase() : "—"}
        </span>
      </div>
      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>{track.source}</span>
      {missingCore && onEnrich && (
        <button onClick={() => onEnrich(track)} disabled={!apiKey || enriching}
          className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20"
          title={apiKey ? "Auto-fill via GetSongBPM" : "Set API key first"}
          style={{ color: "#7BAE8F" }}>
          {enriching ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
        </button>
      )}
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100" style={{ color: "rgba(255,255,255,0.4)" }}><Edit3 size={12} /></button>
      <button onClick={() => onDelete(track.id)} className="opacity-0 group-hover:opacity-100" style={{ color: "rgba(255,255,255,0.4)" }}><Trash2 size={12} /></button>
    </div>
  );
}

// ============ PHASE SECTION ============

function PhaseSection({ phase, tracks, crate, anchorKey, anchorBpm, anchorEnergy, onAddTrack, onRemoveTrack, onMarkAnchor, anchorId }) {
  const [showRecs, setShowRecs] = useState(false);
  const excludeIds = tracks.map(t => t.id);
  const recs = useMemo(
    () => getRecommendations(crate, phase.id, anchorKey, anchorBpm, anchorEnergy, excludeIds, 10),
    [phase.id, anchorKey, anchorBpm, anchorEnergy, tracks.length, crate.length]
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ background: phase.color, boxShadow: `0 0 12px ${phase.color}` }} />
        <h3 className="text-xs tracking-[0.25em] uppercase font-bold" style={{ color: phase.color }}>
          {String(phase.position + 1).padStart(2, "0")} · {phase.name}
        </h3>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${phase.color}, transparent)` }} />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
          {phase.bpmRange[0]}–{phase.bpmRange[1]} BPM · E{phase.energyRange[0]}–{phase.energyRange[1]}
        </span>
      </div>
      <p className="text-xs mb-3 pl-6 italic" style={{ color: "rgba(255,255,255,0.5)" }}>{phase.description}</p>

      <div className="pl-6 space-y-2">
        {tracks.length === 0 && (<div className="text-xs py-2" style={{ color: "rgba(255,255,255,0.3)" }}>— no tracks yet —</div>)}
        {tracks.map((track, idx) => {
          const isAnchor = anchorId === track.id;
          return (
            <div key={track.id + idx} className="group relative flex items-center gap-3 p-3 rounded-md transition-all"
              style={{ background: isAnchor ? "rgba(232, 93, 117, 0.12)" : "rgba(255,255,255,0.03)", border: isAnchor ? "1px solid rgba(232, 93, 117, 0.4)" : "1px solid rgba(255,255,255,0.06)" }}>
              {isAnchor && <Anchor size={12} style={{ color: "#E85D75" }} />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "#F5F1E8" }}>{track.title}</div>
                <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{track.artist}</div>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span className={track.bpm ? "" : "opacity-40"}>{track.bpm || "—"}</span>
                <span style={{ color: track.key ? phase.color : "rgba(255,255,255,0.3)" }}>{track.key || "—"}</span>
                <span className={track.energy ? "" : "opacity-40"}>E{track.energy || "—"}</span>
              </div>
              <button onClick={() => onMarkAnchor(track.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: isAnchor ? "#E85D75" : "rgba(255,255,255,0.4)" }} title="Mark as anchor">
                <Anchor size={14} />
              </button>
              <button onClick={() => onRemoveTrack(phase.id, idx)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(255,255,255,0.4)" }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        <button onClick={() => setShowRecs(!showRecs)}
          className="w-full text-left text-xs py-2 px-3 rounded-md transition-all flex items-center gap-2 uppercase tracking-wider"
          style={{ background: showRecs ? `${phase.color}20` : "rgba(255,255,255,0.02)", border: `1px dashed ${phase.color}60`, color: phase.color }}>
          <Sparkles size={12} />
          {showRecs ? "Hide" : `Suggest from crate (${recs.length})`}
        </button>

        {showRecs && (
          <div className="space-y-1 pt-1">
            {recs.length === 0 ? (
              <div className="text-xs p-3 rounded" style={{ background: "rgba(212,163,115,0.08)", color: "#D4A373" }}>
                No matching tracks in your crate. Import more tracks via the Crate button (top right) — try a 1001tracklists URL in your genre or your Rekordbox XML.
              </div>
            ) : recs.map((rec) => (
              <button key={rec.id} onClick={() => { onAddTrack(phase.id, rec); setShowRecs(false); }}
                className="w-full text-left p-2 rounded-md flex items-center gap-3 transition-all hover:bg-white/5" style={{ background: "rgba(255,255,255,0.015)" }}>
                <Plus size={12} style={{ color: phase.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: "#F5F1E8" }}>{rec.title}</div>
                  <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{rec.artist}{rec.label ? ` · ${rec.label}` : ""}</div>
                </div>
                <div className="flex gap-1.5 text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span>{rec.bpm || "?"}</span>
                  <span style={{ color: rec.key ? phase.color : "rgba(255,255,255,0.3)" }}>{rec.key || "?"}</span>
                  <span>E{rec.energy || "?"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransitionAnalysis({ tracks }) {
  if (tracks.length < 2) return null;
  const transitions = [];
  for (let i = 1; i < tracks.length; i++) {
    const prev = tracks[i - 1], curr = tracks[i];
    const quality = getTransitionQuality(prev.key, curr.key);
    const bpmDiff = (curr.bpm || 0) - (prev.bpm || 0);
    transitions.push({ prev, curr, quality, bpmDiff });
  }
  const risky = transitions.filter(t => t.quality.rating === "risky" || Math.abs(t.bpmDiff) > 3);
  return (
    <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} style={{ color: "#D4A373" }} />
        <h4 className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: "#D4A373" }}>Transition Flow</h4>
      </div>
      {risky.length === 0 ? (<p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>✓ No risky transitions detected.</p>) : (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{risky.length} transition{risky.length > 1 ? "s" : ""} to review:</p>
          {risky.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded" style={{ background: "rgba(232, 93, 117, 0.08)" }}>
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#E85D75" }} />
              <div style={{ color: "rgba(255,255,255,0.7)" }}>
                <span className="font-medium">{t.prev.title}</span> → <span className="font-medium">{t.curr.title}</span>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {t.prev.key || "?"} → {t.curr.key || "?"} · {t.quality.note || "key unknown"}
                  {Math.abs(t.bpmDiff) > 3 && ` · ${t.bpmDiff > 0 ? "+" : ""}${t.bpmDiff} BPM jump`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN APP ============

export default function SetlistArchitect() {
  const [gigName, setGigName] = useState("Untitled Set");
  const [gigTheme, setGigTheme] = useState("");
  const [showTheme, setShowTheme] = useState(false);
  const [anchorId, setAnchorId] = useState(null);
  const [crateOpen, setCrateOpen] = useState(false);
  const [crate, setCrate] = useState(SEED_CRATE);
  const [apiKey, setApiKey] = useState("");
  const [phaseTracks, setPhaseTracks] = useState({ invitation: [], build: [], peak: [], reset: [], sendoff: [] });

  const addToCrate = (newTracks) => {
    setCrate(prev => {
      const existing = new Set(prev.map(t => `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`));
      const fresh = newTracks.filter(t => {
        const k = `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`;
        return !existing.has(k);
      }).map(t => ({ ...t, id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` }));
      return [...prev, ...fresh];
    });
  };

  const updateCrateTrack = (updated) => {
    setCrate(prev => prev.map(t => t.id === updated.id ? updated : t));
    // also update in setlist if present
    setPhaseTracks(prev => {
      const next = {};
      for (const [pid, tracks] of Object.entries(prev)) {
        next[pid] = tracks.map(t => t.id === updated.id ? { ...t, ...updated } : t);
      }
      return next;
    });
  };

  const deleteFromCrate = (id) => {
    setCrate(prev => prev.filter(t => t.id !== id));
    setPhaseTracks(prev => {
      const next = {};
      for (const [pid, tracks] of Object.entries(prev)) {
        next[pid] = tracks.filter(t => t.id !== id);
      }
      return next;
    });
    if (anchorId === id) setAnchorId(null);
  };

  const allTracks = useMemo(() => PHASES.flatMap(p => phaseTracks[p.id].map(t => ({ ...t, _phaseId: p.id }))), [phaseTracks]);
  const anchor = useMemo(() => anchorId ? allTracks.find(t => t.id === anchorId) : null, [anchorId, allTracks]);

  const addTrack = (phaseId, track) => {
    setPhaseTracks(prev => ({ ...prev, [phaseId]: [...prev[phaseId], track] }));
  };
  const removeTrack = (phaseId, idx) => {
    setPhaseTracks(prev => {
      const track = prev[phaseId][idx];
      if (anchorId === track.id) setAnchorId(null);
      return { ...prev, [phaseId]: prev[phaseId].filter((_, i) => i !== idx) };
    });
  };
  const markAnchor = (trackId) => setAnchorId(anchorId === trackId ? null : trackId);

  const exportSetlist = () => {
    let out = `${gigName}\n${"═".repeat(gigName.length)}\n\n`;
    if (gigTheme) out += `Theme: ${gigTheme}\n\n`;
    let n = 1;
    PHASES.forEach(phase => {
      const tracks = phaseTracks[phase.id];
      if (tracks.length === 0) return;
      out += `▸ ${phase.name.toUpperCase()} (${phase.bpmRange[0]}–${phase.bpmRange[1]} BPM)\n`;
      tracks.forEach(t => {
        const isA = anchorId === t.id ? " ⚓" : "";
        out += `  ${String(n).padStart(2, "0")}. ${t.title} — ${t.artist}${isA}\n`;
        out += `      ${t.bpm || "?"} BPM · ${t.key || "?"} · E${t.energy || "?"}\n`;
        n++;
      });
      out += "\n";
    });
    const blob = new Blob([out], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${gigName.replace(/\s+/g, "_")}_setlist.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalTracks = allTracks.length;
  const tracksWithBpm = allTracks.filter(t => t.bpm);
  const avgBpm = tracksWithBpm.length > 0 ? (tracksWithBpm.reduce((s, t) => s + t.bpm, 0) / tracksWithBpm.length).toFixed(1) : "—";
  const bpmRange = tracksWithBpm.length > 0 ? `${Math.min(...tracksWithBpm.map(t => t.bpm))}–${Math.max(...tracksWithBpm.map(t => t.bpm))}` : "—";

  return (
    <div className="min-h-screen w-full p-6" style={{ background: "radial-gradient(ellipse at top, #1a1530 0%, #0a0812 50%, #050408 100%)", fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: "#F5F1E8" }}>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-2 mb-2">
                <Music size={14} className="pulse" style={{ color: "#E85D75" }} />
                <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>The Setlist Architect · v3</span>
              </div>
              <input value={gigName} onChange={(e) => setGigName(e.target.value)}
                className="display-font text-4xl md:text-5xl font-bold bg-transparent w-full italic"
                style={{ color: "#F5F1E8", letterSpacing: "-0.02em" }} />
              <button onClick={() => setShowTheme(!showTheme)} className="text-xs mt-2 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Edit3 size={10} /> {gigTheme || "Add a theme..."}
              </button>
              {showTheme && (
                <textarea value={gigTheme} onChange={(e) => setGigTheme(e.target.value)} placeholder="e.g. Late-night groovy tech house that builds to hands-in-the-air peaks"
                  className="w-full mt-2 p-2 text-sm rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.1)" }} rows={2} />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCrateOpen(true)} className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.2em] rounded transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "#F5F1E8", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Package size={12} /> Crate <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(232,93,117,0.2)", color: "#E85D75" }}>{crate.length}</span>
              </button>
              <button onClick={exportSetlist} disabled={totalTracks === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.2em] rounded transition-all disabled:opacity-30"
                style={{ background: "#E85D75", color: "#0a0812", fontWeight: 700 }}>
                <Download size={12} /> Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Stat label="Tracks" value={totalTracks} />
            <Stat label="BPM Range" value={bpmRange} />
            <Stat label="Avg BPM" value={avgBpm} />
            <Stat label="Anchor" value={anchor ? (anchor.key || "?") : "—"} />
          </div>
        </header>

        {totalTracks > 0 && (<div className="mb-8"><EnergyArc tracks={allTracks} /></div>)}

        {totalTracks === 0 && (
          <div className="mb-8 p-5 rounded-lg" style={{ background: "rgba(232, 93, 117, 0.06)", border: "1px solid rgba(232, 93, 117, 0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Anchor size={14} style={{ color: "#E85D75" }} />
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: "#E85D75" }}>Start with the Anchor</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              Pro DJs build sets backward from their <span style={{ color: "#E85D75" }}>anchor track</span> — the one record they know they're playing. Usually a peak-time heater.
              Open the <span style={{ color: "#E85D75" }}>Crate</span> to import tracks from 1001tracklists URLs, your Rekordbox XML, or manually. Then drop your anchor in the Peak phase, mark it, and let recommendations build the journey.
            </p>
          </div>
        )}

        <div className="space-y-8 mb-8">
          {PHASES.map(phase => (
            <PhaseSection key={phase.id} phase={phase} tracks={phaseTracks[phase.id]} crate={crate}
              anchorKey={anchor?.key} anchorBpm={anchor?.bpm} anchorEnergy={anchor?.energy}
              onAddTrack={addTrack} onRemoveTrack={removeTrack} onMarkAnchor={markAnchor} anchorId={anchorId} />
          ))}
        </div>

        {totalTracks >= 2 && (<div className="mb-8"><TransitionAnalysis tracks={allTracks} /></div>)}

        <footer className="pt-8 mt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
            <h4 className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.5)" }}>The Workflow</h4>
          </div>
          <ol className="space-y-1.5 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            <li>01 · <span style={{ color: "#E85D75" }}>Build your crate</span> — import 1001TL sets, Rekordbox XML, or add manually.</li>
            <li>02 · Pick your <span style={{ color: "#E85D75" }}>anchor</span> — the one track you know you're playing (usually Peak phase).</li>
            <li>03 · Let suggestions fill the arc — Camelot + BPM + phase scoring does the heavy lifting.</li>
            <li>04 · Check transitions. Risky key jumps or {">"}3 BPM gaps need reset tracks.</li>
            <li>05 · Prepare 20–30% alternates. Export and load into Rekordbox to prep.</li>
          </ol>
          <p className="text-[10px] mt-6 italic" style={{ color: "rgba(255,255,255,0.3)" }}>
            Your crate and setlist stay in this session. To persist across sessions, export and re-import.
            Recommendations pull from YOUR crate — the more you import, the more unique your sets become.
          </p>
          <div className="mt-6 p-3 rounded flex items-center gap-2 text-[11px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}>
            <Zap size={12} style={{ color: "#E85D75" }} />
            <span>Tempo, key &amp; Camelot data powered by <a href="https://getsongbpm.com" target="_blank" rel="noopener noreferrer" style={{ color: "#E85D75", fontWeight: 700 }}>GetSongBPM.com</a></span>
          </div>
        </footer>
      </div>

      {crateOpen && (<CrateManager crate={crate} onClose={() => setCrateOpen(false)} onAddTracks={addToCrate} onUpdateTrack={updateCrateTrack} onDeleteTrack={deleteFromCrate} apiKey={apiKey} onApiKeyChange={setApiKey} />)}
    </div>
  );
}
