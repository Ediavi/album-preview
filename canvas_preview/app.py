#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║          SPOTIFY CANVAS PREVIEW PLAYER                   ║
║  Simule l'expérience Canvas de Spotify sur ton desktop   ║
╠══════════════════════════════════════════════════════════╣
║  SETUP (1 fois seulement):                               ║
║    pip install flask                                     ║
║                                                          ║
║  UTILISATION:                                            ║
║    1. Modifie config.json avec tes fichiers audio/vidéo  ║
║    2. Lance: python app.py                               ║
║    3. Le navigateur s'ouvre automatiquement              ║
║                                                          ║
║  RACCOURCIS CLAVIER:                                     ║
║    Espace     → Lecture / Pause                          ║
║    ← →        → Reculer / Avancer de 10s                 ║
║    ↑ ↓        → Volume                                   ║
╚══════════════════════════════════════════════════════════╝
"""

from flask import Flask, jsonify, abort, Response, request
from pathlib import Path
import json
import mimetypes
import webbrowser
import threading

app = Flask(__name__)
CONFIG = {}
CONFIG_PATH = Path("config.json")

# ─── Config ───────────────────────────────────────────────────────────────────

EXAMPLE_CONFIG = {
    "ep_name": "Mon EP",
    "artist": "Ton Nom",
    "cover": "",
    "tracks": [
        {
            "title": "Titre du morceau 1",
            "audio": "chemin/vers/track1.mp3",
            "canvas": "chemin/vers/canvas1.mp4",
            "cover": ""
        },
        {
            "title": "Titre du morceau 2",
            "audio": "chemin/vers/track2.mp3",
            "canvas": "chemin/vers/canvas2.mp4",
            "cover": ""
        }
    ]
}

def load_config():
    global CONFIG
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            CONFIG = json.load(f)
        n = len(CONFIG.get("tracks", []))
        print(f"  ✓ {n} morceau{'x' if n > 1 else ''} chargé{'s' if n > 1 else ''}")
    else:
        CONFIG = EXAMPLE_CONFIG
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(CONFIG, f, indent=2, ensure_ascii=False)
        print("  ⚠  config.json créé — modifie-le avec tes fichiers, puis relance.")

# ─── Media serving (avec support des range requests pour le seek) ─────────────

def serve_media_file(file_path_str):
    path = Path(file_path_str)
    if not path.exists():
        abort(404)

    mime, _ = mimetypes.guess_type(str(path))
    if not mime:
        mime = "application/octet-stream"

    file_size = path.stat().st_size
    range_header = request.headers.get("Range")

    if range_header:
        parts = range_header.replace("bytes=", "").split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        length = end - start + 1

        with open(path, "rb") as f:
            f.seek(start)
            data = f.read(length)

        resp = Response(data, 206, mimetype=mime)
        resp.headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        resp.headers["Accept-Ranges"] = "bytes"
        resp.headers["Content-Length"] = str(length)
        return resp

    with open(path, "rb") as f:
        data = f.read()
    resp = Response(data, 200, mimetype=mime)
    resp.headers["Accept-Ranges"] = "bytes"
    resp.headers["Content-Length"] = str(file_size)
    return resp

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return HTML_TEMPLATE

@app.route("/api/config")
def get_config():
    safe = {
        "ep_name": CONFIG.get("ep_name", "EP"),
        "artist":  CONFIG.get("artist", ""),
        "has_cover": bool(CONFIG.get("cover") and Path(CONFIG["cover"]).exists()),
        "tracks": []
    }
    for i, t in enumerate(CONFIG.get("tracks", [])):
        safe["tracks"].append({
            "id":         i,
            "title":      t.get("title", f"Track {i+1}"),
            "has_audio":  bool(t.get("audio")  and Path(t["audio"]).exists()),
            "has_canvas": bool(t.get("canvas") and Path(t["canvas"]).exists()),
            "has_cover":  bool(t.get("cover")  and Path(t["cover"]).exists()),
        })
    return jsonify(safe)

@app.route("/media/audio/<int:idx>")
def serve_audio(idx):
    tracks = CONFIG.get("tracks", [])
    if not (0 <= idx < len(tracks)):
        abort(404)
    return serve_media_file(tracks[idx].get("audio", ""))

@app.route("/media/canvas/<int:idx>")
def serve_canvas(idx):
    tracks = CONFIG.get("tracks", [])
    if not (0 <= idx < len(tracks)):
        abort(404)
    return serve_media_file(tracks[idx].get("canvas", ""))

@app.route("/media/cover/<cover_id>")
def serve_cover(cover_id):
    tracks = CONFIG.get("tracks", [])
    if cover_id == "ep":
        path = CONFIG.get("cover", "")
    else:
        i = int(cover_id)
        if not (0 <= i < len(tracks)):
            abort(404)
        path = tracks[i].get("cover", "") or CONFIG.get("cover", "")
    return serve_media_file(path)

# ─── HTML / CSS / JS ──────────────────────────────────────────────────────────

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Canvas Preview</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}

:root{
  --bg:#121212;
  --sidebar:#000;
  --card:#282828;
  --hover:rgba(255,255,255,.07);
  --active:rgba(255,255,255,.12);
  --green:#1DB954;
  --green2:#1ed760;
  --white:#fff;
  --grey:rgba(255,255,255,.65);
  --muted:rgba(255,255,255,.38);
  --font:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;
}

html,body{height:100%;overflow:hidden;background:#000}
body{font-family:var(--font);color:var(--white);display:flex;flex-direction:column}

/* ── Loading ── */
#loading{
  position:fixed;inset:0;background:#000;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:18px;z-index:999;
}
.dots{display:flex;gap:7px}
.dot{width:9px;height:9px;border-radius:50%;background:var(--green);animation:bounce 1.1s infinite ease-in-out}
.dot:nth-child(2){animation-delay:.15s}
.dot:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1.2);opacity:1}}
#loading p{font-size:13px;color:var(--muted);letter-spacing:.5px}

/* ── App layout ── */
#app{display:none;flex:1;height:100vh;overflow:hidden}
.layout{display:flex;height:100%}

/* ── Sidebar ── */
.sidebar{
  width:270px;min-width:270px;
  background:var(--sidebar);
  display:flex;flex-direction:column;
  overflow:hidden;
}

.ep-header{
  padding:20px 14px 14px;
  display:flex;gap:13px;align-items:flex-end;
  border-bottom:1px solid rgba(255,255,255,.06);
}

.ep-cover-wrap{
  width:78px;height:78px;flex-shrink:0;
  border-radius:5px;overflow:hidden;
  background:var(--card);
  box-shadow:0 4px 18px rgba(0,0,0,.6);
  display:flex;align-items:center;justify-content:center;
  font-size:30px;
}
.ep-cover-wrap img{width:100%;height:100%;object-fit:cover}

.ep-meta{min-width:0;flex:1}
.ep-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:5px}
.ep-name{font-size:15px;font-weight:800;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ep-artist{font-size:12px;color:var(--grey);margin-top:3px}

.track-list{
  flex:1;overflow-y:auto;padding:6px 0 40px;
  scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent;
}
.track-list::-webkit-scrollbar{width:5px}
.track-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}

.track-row{
  display:flex;align-items:center;gap:11px;
  padding:7px 14px;cursor:pointer;
  border-radius:3px;transition:background .1s;
}
.track-row:hover{background:var(--hover)}
.track-row.active{background:var(--active)}

.t-num{
  width:18px;text-align:center;font-size:13px;
  color:var(--muted);flex-shrink:0;line-height:1;
}
.track-row.active .t-num{color:var(--green)}
.track-row.active .t-num .n{display:none}
.track-row.active .t-num .eq{display:flex}
.t-num .eq{display:none;gap:2px;align-items:flex-end;height:13px}
.eq-bar{width:3px;background:var(--green);border-radius:1px}
.eq-bar:nth-child(1){animation:eq1 .7s infinite ease-in-out;height:4px}
.eq-bar:nth-child(2){animation:eq2 .7s infinite ease-in-out .1s;height:9px}
.eq-bar:nth-child(3){animation:eq1 .7s infinite ease-in-out .2s;height:5px}
@keyframes eq1{0%,100%{height:3px}50%{height:13px}}
@keyframes eq2{0%,100%{height:8px}50%{height:3px}}

.t-info{min-width:0;flex:1}
.t-title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.track-row.active .t-title{color:var(--green)}
.t-canvas-tag{
  display:inline-flex;align-items:center;gap:4px;
  font-size:9.5px;color:var(--muted);margin-top:2px;
}
.canvas-dot{width:5px;height:5px;border-radius:50%;background:var(--green);opacity:.75;flex-shrink:0}

/* ── Now Playing ── */
.now-playing{
  flex:1;position:relative;overflow:hidden;
  background:#000;
}

#canvas-video{
  position:absolute;inset:0;
  width:100%;height:100%;
  object-fit:cover;z-index:0;
}

.np-fallback{
  position:absolute;inset:0;z-index:0;
  display:none;align-items:center;justify-content:center;
}
.np-fallback .blur-bg{
  position:absolute;inset:0;
  width:100%;height:100%;object-fit:cover;
  filter:blur(50px) brightness(.35) saturate(1.2);
  transform:scale(1.1);
}
.np-fallback .cover-art{
  position:relative;z-index:1;
  width:min(38vh,220px);height:min(38vh,220px);
  border-radius:8px;object-fit:cover;
  box-shadow:0 20px 70px rgba(0,0,0,.8);
}
.np-fallback .placeholder-art{
  position:relative;z-index:1;
  width:min(38vh,220px);height:min(38vh,220px);
  border-radius:8px;background:var(--card);
  display:flex;align-items:center;justify-content:center;font-size:64px;
  box-shadow:0 20px 70px rgba(0,0,0,.8);
}

/* Gradients */
.grad-top{
  position:absolute;inset:0;height:35%;
  background:linear-gradient(to bottom,rgba(0,0,0,.55),transparent);
  z-index:1;pointer-events:none;
}
.grad-bottom{
  position:absolute;bottom:0;left:0;right:0;height:62%;
  background:linear-gradient(to top,rgba(0,0,0,.97) 0%,rgba(0,0,0,.75) 40%,transparent 100%);
  z-index:1;pointer-events:none;
}

/* Canvas badge */
.canvas-badge{
  position:absolute;top:14px;right:14px;z-index:3;
  background:rgba(0,0,0,.55);backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  padding:3px 10px;border-radius:20px;
  font-size:10px;font-weight:700;letter-spacing:1.2px;
  color:rgba(255,255,255,.75);text-transform:uppercase;
  display:none;
}

/* Player controls overlay */
.player-ui{
  position:absolute;bottom:0;left:0;right:0;
  z-index:2;padding:0 30px 22px;
}

.np-track-info{margin-bottom:18px}
.np-title{
  font-size:clamp(20px,3.2vw,34px);
  font-weight:900;letter-spacing:-.5px;
  text-shadow:0 2px 10px rgba(0,0,0,.6);
  line-height:1.15;
}
.np-artist{
  font-size:14px;color:var(--grey);margin-top:5px;
  font-weight:500;text-shadow:0 1px 5px rgba(0,0,0,.6);
}

/* Progress */
.prog-row{display:flex;align-items:center;gap:11px;margin-bottom:14px}
.prog-time{font-size:11px;color:var(--grey);min-width:33px;font-variant-numeric:tabular-nums}
.prog-time.right{text-align:right}

.prog-track{
  flex:1;height:4px;background:rgba(255,255,255,.22);
  border-radius:2px;cursor:pointer;position:relative;
  transition:height .1s;
}
.prog-track:hover{height:6px}
.prog-fill{
  height:100%;background:var(--white);
  border-radius:2px;pointer-events:none;
  transition:background .15s;position:relative;
}
.prog-track:hover .prog-fill{background:var(--green)}
.prog-fill::after{
  content:'';position:absolute;right:-6px;top:50%;
  transform:translateY(-50%) scale(0);
  width:12px;height:12px;border-radius:50%;background:#fff;
  transition:transform .1s;
}
.prog-track:hover .prog-fill::after{transform:translateY(-50%) scale(1)}

/* Controls */
.ctrl-row{display:flex;align-items:center;gap:4px}
.btn{
  background:none;border:none;cursor:pointer;
  color:var(--grey);padding:8px;
  border-radius:50%;display:flex;align-items:center;justify-content:center;
  transition:color .12s,transform .1s;
}
.btn:hover{color:var(--white);transform:scale(1.07)}
.btn:active{transform:scale(.94)}

.btn-play{
  width:50px;height:50px;
  background:var(--white) !important;
  color:#000 !important;
  border-radius:50% !important;
  margin:0 6px;
}
.btn-play:hover{background:#e5e5e5 !important;transform:scale(1.07) !important}

.ctrl-right{margin-left:auto;display:flex;align-items:center;gap:6px}
.vol-wrap{display:flex;align-items:center;gap:7px}

input[type=range]{
  -webkit-appearance:none;appearance:none;
  width:78px;height:4px;
  background:rgba(255,255,255,.22);border-radius:2px;outline:none;cursor:pointer;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:12px;height:12px;
  border-radius:50%;background:#fff;cursor:pointer;
}
input[type=range]:hover{background:rgba(255,255,255,.35)}
</style>
</head>
<body>

<!-- Loading -->
<div id="loading">
  <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  <p>Chargement...</p>
</div>

<!-- App -->
<div id="app">
<div class="layout">

  <!-- Sidebar -->
  <div class="sidebar">
    <div class="ep-header">
      <div class="ep-cover-wrap" id="ep-cover-wrap">
        <span id="ep-cover-placeholder">🎵</span>
      </div>
      <div class="ep-meta">
        <div class="ep-label">EP</div>
        <div class="ep-name" id="ep-name">—</div>
        <div class="ep-artist" id="ep-artist-side">—</div>
      </div>
    </div>
    <div class="track-list" id="track-list"></div>
  </div>

  <!-- Now Playing -->
  <div class="now-playing">

    <video id="canvas-video" loop muted playsinline></video>

    <div class="np-fallback" id="np-fallback">
      <img class="blur-bg"   id="fallback-blur"  src="" alt="">
      <img class="cover-art" id="fallback-cover" src="" alt="" style="display:none">
      <div class="placeholder-art" id="fallback-placeholder">🎵</div>
    </div>

    <div class="grad-top"></div>
    <div class="grad-bottom"></div>
    <div class="canvas-badge" id="canvas-badge">Canvas</div>

    <div class="player-ui">
      <div class="np-track-info">
        <div class="np-title"  id="np-title">—</div>
        <div class="np-artist" id="np-artist">—</div>
      </div>

      <div class="prog-row">
        <span class="prog-time"       id="t-cur">0:00</span>
        <div  class="prog-track"      id="prog-track">
          <div class="prog-fill"      id="prog-fill" style="width:0%"></div>
        </div>
        <span class="prog-time right" id="t-dur">0:00</span>
      </div>

      <div class="ctrl-row">

        <button class="btn" id="btn-prev" title="Précédent (←)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
          </svg>
        </button>

        <button class="btn btn-play" id="btn-play" title="Lecture/Pause (Espace)">
          <svg id="ico-play"  width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg id="ico-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>

        <button class="btn" id="btn-next" title="Suivant (→)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <div class="ctrl-right">
          <div class="vol-wrap">
            <button class="btn" id="btn-mute" title="Muet">
              <svg id="ico-vol" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
              <svg id="ico-mute" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>
              </svg>
            </button>
            <input type="range" id="vol-slider" min="0" max="100" value="80" title="Volume (↑↓)">
          </div>
        </div>

      </div>
    </div>
  </div>

</div>
</div>

<audio id="audio" preload="metadata"></audio>

<script>
'use strict';

let cfg = null;
let current = 0;
let playing = false;
let seeking = false;

const audio      = document.getElementById('audio');
const vid        = document.getElementById('canvas-video');
const progTrack  = document.getElementById('prog-track');
const progFill   = document.getElementById('prog-fill');
const volSlider  = document.getElementById('vol-slider');

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const r = await fetch('/api/config');
    cfg = await r.json();

    document.getElementById('ep-name').textContent       = cfg.ep_name;
    document.getElementById('ep-artist-side').textContent = cfg.artist;
    document.title = cfg.ep_name + ' — Canvas Preview';

    if (cfg.has_cover) {
      const img = document.createElement('img');
      img.src = '/media/cover/ep';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      const wrap = document.getElementById('ep-cover-wrap');
      wrap.innerHTML = '';
      wrap.appendChild(img);
    }

    buildList();
    if (cfg.tracks.length) loadTrack(0, false);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display     = 'block';

  } catch(e) {
    document.getElementById('loading').innerHTML =
      '<p style="color:#ff6b6b;font-size:14px;">Erreur: impossible de charger la configuration.<br>Vérifie que config.json est bien renseigné.</p>';
  }
}

// ── Track list ────────────────────────────────────────────────────────────────
function buildList() {
  const list = document.getElementById('track-list');
  list.innerHTML = '';
  cfg.tracks.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.id = 'tr-' + i;
    row.innerHTML =
      `<div class="t-num">
         <span class="n">${i+1}</span>
         <span class="eq"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></span>
       </div>
       <div class="t-info">
         <div class="t-title">${esc(t.title)}</div>
         ${t.has_canvas ? '<div class="t-canvas-tag"><span class="canvas-dot"></span>Canvas</div>' : ''}
       </div>`;
    row.addEventListener('click', () => loadTrack(i, false));
    list.appendChild(row);
  });
}

// ── Load track ────────────────────────────────────────────────────────────────
function loadTrack(idx, autoplay) {
  if (!cfg || idx < 0 || idx >= cfg.tracks.length) return;
  current = idx;
  const t = cfg.tracks[idx];

  // Sidebar highlight
  document.querySelectorAll('.track-row').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  // Track info
  document.getElementById('np-title').textContent  = t.title;
  document.getElementById('np-artist').textContent = cfg.artist;

  // Audio
  if (t.has_audio) {
    audio.src = '/media/audio/' + idx;
    audio.load();
  } else {
    audio.src = '';
  }

  // Canvas video
  if (t.has_canvas) {
    vid.src = '/media/canvas/' + idx;
    vid.load();
    vid.play().catch(() => {});
    vid.style.display = 'block';
    document.getElementById('np-fallback').style.display = 'none';
    document.getElementById('canvas-badge').style.display = 'block';
  } else {
    vid.pause();
    vid.src = '';
    vid.style.display = 'none';
    document.getElementById('canvas-badge').style.display = 'none';
    showFallback(idx, t);
  }

  // Reset progress
  progFill.style.width = '0%';
  document.getElementById('t-cur').textContent = '0:00';
  document.getElementById('t-dur').textContent = '0:00';

  if (autoplay || playing) {
    audio.play().catch(() => {});
    setPlaying(true);
  }
}

function showFallback(idx, t) {
  const fb = document.getElementById('np-fallback');
  fb.style.display = 'flex';
  const src = t.has_cover ? '/media/cover/'+idx : (cfg.has_cover ? '/media/cover/ep' : '');
  const blurEl  = document.getElementById('fallback-blur');
  const covEl   = document.getElementById('fallback-cover');
  const phEl    = document.getElementById('fallback-placeholder');
  if (src) {
    blurEl.src = src; blurEl.style.display = 'block';
    covEl.src  = src; covEl.style.display  = 'block';
    phEl.style.display = 'none';
  } else {
    blurEl.src = ''; blurEl.style.display = 'none';
    covEl.src  = ''; covEl.style.display  = 'none';
    phEl.style.display = 'flex';
  }
}

// ── Playback ──────────────────────────────────────────────────────────────────
function setPlaying(state) {
  playing = state;
  document.getElementById('ico-play').style.display  = state ? 'none'  : 'block';
  document.getElementById('ico-pause').style.display = state ? 'block' : 'none';
  if (state) vid.play().catch(() => {});
  else        vid.pause();
}

function togglePlay() {
  if (playing) {
    audio.pause();
  } else {
    audio.play().catch(() => {});
  }
}

audio.addEventListener('play',  () => setPlaying(true));
audio.addEventListener('pause', () => setPlaying(false));

audio.addEventListener('timeupdate', () => {
  if (seeking || !audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progFill.style.width = pct + '%';
  document.getElementById('t-cur').textContent = fmt(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  document.getElementById('t-dur').textContent = fmt(audio.duration);
});

audio.addEventListener('ended', () => {
  if (current < cfg.tracks.length - 1) {
    loadTrack(current + 1, true);
  } else {
    setPlaying(false);
  }
});

// ── Controls ──────────────────────────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click', togglePlay);

document.getElementById('btn-prev').addEventListener('click', () => {
  if (audio.currentTime > 3) audio.currentTime = 0;
  else loadTrack(Math.max(0, current - 1), playing);
});

document.getElementById('btn-next').addEventListener('click', () => {
  loadTrack(Math.min(cfg.tracks.length - 1, current + 1), playing);
});

// Progress bar seek
progTrack.addEventListener('mousedown', e => { seeking = true; doSeek(e); });
document.addEventListener('mousemove',  e => { if (seeking) doSeek(e); });
document.addEventListener('mouseup',    () => { seeking = false; });

function doSeek(e) {
  const r   = progTrack.getBoundingClientRect();
  const pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  progFill.style.width = (pct * 100) + '%';
  if (audio.duration) {
    audio.currentTime = pct * audio.duration;
    document.getElementById('t-cur').textContent = fmt(audio.currentTime);
  }
}

// Volume
audio.volume = 0.8;
volSlider.addEventListener('input', () => { audio.volume = volSlider.value / 100; });

document.getElementById('btn-mute').addEventListener('click', () => {
  audio.muted = !audio.muted;
  document.getElementById('ico-vol').style.display  = audio.muted ? 'none'  : 'block';
  document.getElementById('ico-mute').style.display = audio.muted ? 'block' : 'none';
});

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space':
      e.preventDefault(); togglePlay(); break;
    case 'ArrowRight':
      if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); break;
    case 'ArrowLeft':
      audio.currentTime = Math.max(0, audio.currentTime - 10); break;
    case 'ArrowUp':
      volSlider.value = Math.min(100, +volSlider.value + 10);
      audio.volume = volSlider.value / 100; break;
    case 'ArrowDown':
      volSlider.value = Math.max(0, +volSlider.value - 10);
      audio.volume = volSlider.value / 100; break;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(s) {
  if (isNaN(s)) return '0:00';
  return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
}
function esc(str) {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}

init();
</script>
</body>
</html>"""

# ─── Launch ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n  🎵  Spotify Canvas Preview")
    print("  " + "─" * 36)
    load_config()
    print("  → http://localhost:5050\n")
    threading.Timer(1.5, lambda: webbrowser.open("http://localhost:5050")).start()
    app.run(host="localhost", port=5050, debug=False, use_reloader=False)
