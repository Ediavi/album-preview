// components/PublicView.tsx
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Script from 'next/script'
import type { AlbumRow, TrackRow } from '@/lib/types'

interface Props {
  album: AlbumRow
  tracks: TrackRow[]
}

function fmt(s: number): string {
  if (isNaN(s)) return '0:00'
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
}

function getYtId(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const v = u.searchParams.get('v')
    if (v && v.length === 11) return v
    if (u.hostname === 'youtu.be') return u.pathname.replace('/', '').slice(0, 11)
  } catch {}
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export default function PublicView({ album, tracks }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [duration, setDuration] = useState('0:00')
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [phoneTime, setPhoneTime] = useState('9:41')
  const [scrollArrowVisible, setScrollArrowVisible] = useState(true)

  const audioRef = useRef<HTMLAudioElement>(null)
  // Video pool: one <video> per track per layout (desktop + mobile)
  const desktopVideos = useRef<Map<number, HTMLVideoElement>>(new Map())
  const mobileVideos = useRef<Map<number, HTMLVideoElement>>(new Map())

  const currentTrack = tracks[currentIdx] ?? null

  // Callback ref factories for the video pools
  const setDesktopVideo = useCallback((idx: number) => (el: HTMLVideoElement | null) => {
    if (el) desktopVideos.current.set(idx, el)
    else desktopVideos.current.delete(idx)
  }, [])

  const setMobileVideo = useCallback((idx: number) => (el: HTMLVideoElement | null) => {
    if (el) mobileVideos.current.set(idx, el)
    else mobileVideos.current.delete(idx)
  }, [])

  // Get all video elements for a given track index
  const getVideosForTrack = useCallback((idx: number): HTMLVideoElement[] => {
    const vids: HTMLVideoElement[] = []
    const d = desktopVideos.current.get(idx)
    if (d) vids.push(d)
    const m = mobileVideos.current.get(idx)
    if (m) vids.push(m)
    return vids
  }, [])

  // Pause all videos except the given index
  const pauseAllExcept = useCallback((activeIdx: number) => {
    for (const [idx, v] of desktopVideos.current) {
      if (idx !== activeIdx) v.pause()
    }
    for (const [idx, v] of mobileVideos.current) {
      if (idx !== activeIdx) v.pause()
    }
  }, [])

  // Fade scroll arrow on scroll
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 80) setScrollArrowVisible(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Update phone clock
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setPhoneTime(d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'))
    }
    tick()
    const t = setInterval(tick, 60000)
    return () => clearInterval(t)
  }, [])

  // Preload all audio on mount (hidden Audio objects)
  useEffect(() => {
    for (const track of tracks) {
      if (track.audio_url) {
        const a = new Audio()
        a.preload = 'auto'
        a.src = track.audio_url
      }
    }
  }, [tracks])

  const loadTrack = useCallback((idx: number, autoplay = false) => {
    if (idx < 0 || idx >= tracks.length) return
    setCurrentIdx(idx)
    setProgress(0)
    setCurrentTime('0:00')
    setDuration('0:00')
    const audio = audioRef.current
    if (!audio) return
    const track = tracks[idx]
    audio.src = track.audio_url ?? ''
    audio.load()
    if (autoplay) audio.play().catch(() => {})
    // Pause all other videos, play the active one
    pauseAllExcept(idx)
    if (track.canvas_url) {
      for (const v of getVideosForTrack(idx)) {
        v.play().catch(() => {})
      }
    }
  }, [tracks, pauseAllExcept, getVideosForTrack])

  useEffect(() => {
    if (tracks.length > 0) loadTrack(0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play().catch(() => {})
  }, [isPlaying])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    audio.currentTime = pct * audio.duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v / 100
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setIsMuted(audio.muted)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => {
      setIsPlaying(true)
      for (const v of getVideosForTrack(currentIdx)) {
        v.play().catch(() => {})
      }
    }
    const onPause = () => {
      setIsPlaying(false)
      for (const v of getVideosForTrack(currentIdx)) {
        v.pause()
      }
    }
    const onTimeUpdate = () => {
      if (!audio.duration) return
      setProgress((audio.currentTime / audio.duration) * 100)
      setCurrentTime(fmt(audio.currentTime))
    }
    const onLoadedMetadata = () => setDuration(fmt(audio.duration))
    const onEnded = () => {
      if (currentIdx < tracks.length - 1) loadTrack(currentIdx + 1, true)
      else setIsPlaying(false)
    }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [currentIdx, tracks, loadTrack, getVideosForTrack])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      const audio = audioRef.current
      if (!audio) return
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break
        case 'ArrowRight': if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); break
        case 'ArrowLeft': audio.currentTime = Math.max(0, audio.currentTime - 10); break
        case 'ArrowUp': setVolume(v => { const nv = Math.min(100, v + 10); if (audioRef.current) audioRef.current.volume = nv / 100; return nv }); break
        case 'ArrowDown': setVolume(v => { const nv = Math.max(0, v - 10); if (audioRef.current) audioRef.current.volume = nv / 100; return nv }); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay])

  const ytId = getYtId(album.youtube_url)
  const coverSrc = album.cover_url ?? ''

  // Does ANY track have a canvas? (for deciding cover fallback)
  const hasCanvasVideo = currentTrack?.canvas_url

  return (
    <div id="theshow" style={{ display: 'block' }}>
      {/* HERO */}
      <section className="ts-hero">
        <div className="ts-hero-bg">
          {coverSrc && (
            <img
              src={coverSrc}
              alt=""
              className="ts-hero-bg-img"
              fetchPriority="high"
            />
          )}
        </div>
        <div className="ts-hero-content">
          <div className="ts-artwork-wrap">
            {coverSrc ? (
              <Image
                className="ts-artwork"
                src={coverSrc}
                alt="artwork"
                width={420}
                height={420}
                priority
                quality={85}
              />
            ) : (
              <div className="ts-artwork-placeholder">🎵</div>
            )}
          </div>
          <div className="ts-hero-text">
            <div className="ts-ep-name">{album.ep_name || 'Album Preview'}</div>
            <div className="ts-artist">{album.artist}</div>
            {album.description && (
              <div className="ts-description">{album.description}</div>
            )}
          </div>
        </div>
        <div className={`scroll-arrow${scrollArrowVisible ? '' : ' hidden'}`}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* TRACKS — Desktop */}
      <section className="ts-tracks desktop-only">
        <div className="ts-section-label"><span>Morceaux</span></div>
        <div className="show-wrap">
          <div className="tracklist-panel glass">
            <div className="tl-head">
              <div className="tl-ep">{album.ep_name || '—'}</div>
              <div className="tl-art">{album.artist || '—'}</div>
            </div>
            <div className="tl-list">
              {tracks.map((track, i) => (
                <div
                  key={track.id}
                  className={`tl-item${i === currentIdx ? ' active' : ''}`}
                  onClick={() => loadTrack(i, isPlaying)}
                >
                  <span className="tl-item-num">{i + 1}</span>
                  {i === currentIdx && (
                    <span className="tl-wave">
                      <span /><span /><span /><span />
                    </span>
                  )}
                  <span className="tl-item-title">{track.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="phone-screen">
            {/* VIDEO POOL: one <video> per track, all preloading simultaneously */}
            {tracks.map((track, i) =>
              track.canvas_url ? (
                <video
                  key={track.id}
                  ref={setDesktopVideo(i)}
                  className="canvas-video"
                  src={track.canvas_url}
                  loop
                  muted
                  playsInline
                  autoPlay={i === 0}
                  preload="auto"
                  style={{ display: i === currentIdx ? 'block' : 'none' }}
                />
              ) : null
            )}
            {/* Cover fallback when active track has no canvas */}
            {!hasCanvasVideo && (
              <div className="sp-cover-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentTrack?.cover_url ?? coverSrc}
                  alt=""
                  className="sp-cover-img"
                  fetchPriority="high"
                />
              </div>
            )}
            <div className="screen-overlay" />
            <div className="dynamic-island" />
            <div className="status-bar">
              <span className="clk">{phoneTime}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>&#x25AA;&#x25AA;&#x25AA; WiFi &#x1F50B;</span>
            </div>
            <div className="sp-top">
              <span style={{ fontSize: 28, opacity: 0.9 }}>&lsaquo;</span>
              <div className="sp-ep-lbl">
                Lecture depuis l&apos;EP<b>{album.ep_name || '—'}</b>
              </div>
              <span className="sp-menu">&vellip;</span>
            </div>
            <div className="sp-bottom">
              <div className="sp-like-row">
                <div className="sp-song-info">
                  <div className="sp-title">{currentTrack?.title || '—'}</div>
                  <div className="sp-artist-name">{album.artist || '—'}</div>
                </div>
                <span className="sp-heart">&hearts;</span>
              </div>
              <div className="sp-bar" onClick={handleSeek}>
                <div className="sp-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="sp-times">
                <span>{currentTime}</span>
                <span>{duration}</span>
              </div>
              <div className="sp-ctrls">
                <button onClick={() => loadTrack(Math.max(0, currentIdx - 1), isPlaying)}>&#x23EE;</button>
                <button className="sp-play-btn" id="sp_play" onClick={togglePlay}>
                  {isPlaying ? '\u23F8' : '\u25B6'}
                </button>
                <button onClick={() => loadTrack(Math.min(tracks.length - 1, currentIdx + 1), isPlaying)}>&#x23ED;</button>
              </div>
              <div className="sp-volume">
                <button className="sp-vol-icon" onClick={toggleMute}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    {isMuted || volume === 0 ? (
                      <path d="M13.86 5.47a.75.75 0 00-1.06 0l-1.47 1.47-1.47-1.47a.75.75 0 00-1.06 1.06L10.27 8l-1.47 1.47a.75.75 0 101.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 001.06-1.06L12.4 8l1.47-1.47a.75.75 0 000-1.06zM10.82 0H1.73C.77 0 0 .77 0 1.73V14.27C0 15.23.77 16 1.73 16h2.7V0h6.39z" transform="scale(0.7) translate(2,2.5)"/>
                    ) : volume < 50 ? (
                      <path d="M0 5v6h2.8L7 14V2L2.8 5H0zm9-.5v1c1.1.5 2 1.8 2 3.5s-.9 3-2 3.5v1c1.7-.5 3-2.2 3-4.5s-1.3-4-3-4.5z" transform="scale(0.85) translate(1.5,1)"/>
                    ) : (
                      <path d="M0 5v6h2.8L7 14V2L2.8 5H0zm11-.5v1c1.7.8 3 2.8 3 5.5s-1.3 4.7-3 5.5v1c2.3-.8 4-3.2 4-6.5s-1.7-5.7-4-6.5zM9 4.5v1c1.1.5 2 1.8 2 3.5s-.9 3-2 3.5v1c1.7-.5 3-2.2 3-4.5s-1.3-4-3-4.5z" transform="scale(0.75) translate(1.5,1.5)"/>
                    )}
                  </svg>
                </button>
                <div
                  className="sp-vol-track"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
                    const v = Math.round(pct * 100)
                    setVolume(v)
                    if (audioRef.current) { audioRef.current.volume = v / 100; audioRef.current.muted = false }
                    setIsMuted(false)
                  }}
                >
                  <div className="sp-vol-fill" style={{ width: `${isMuted ? 0 : volume}%` }} />
                  <div className="sp-vol-knob" style={{ left: `${isMuted ? 0 : volume}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRACKS — Mobile player */}
      <section className="mob-player mobile-only">
        {/* Cover art: video pool + fallback image */}
        <div className="mob-cover-wrap">
          {tracks.map((track, i) =>
            track.canvas_url ? (
              <video
                key={track.id}
                ref={setMobileVideo(i)}
                className="mob-cover-video"
                src={track.canvas_url}
                loop muted playsInline
                autoPlay={i === 0}
                preload="auto"
                style={{ display: i === currentIdx ? 'block' : 'none' }}
              />
            ) : null
          )}
          {!hasCanvasVideo && (
            <img
              src={currentTrack?.cover_url ?? coverSrc}
              alt=""
              className="mob-cover-art"
              fetchPriority="high"
            />
          )}
        </div>

        {/* Song info */}
        <div className="mob-info">
          <div className="mob-title">{currentTrack?.title || '—'}</div>
          <div className="mob-artist">{album.artist || '—'}</div>
        </div>

        {/* Progress */}
        <div className="mob-progress" onClick={handleSeek}>
          <div className="mob-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="mob-times">
          <span>{currentTime}</span>
          <span>{duration}</span>
        </div>

        {/* Controls */}
        <div className="mob-controls">
          <button className="mob-ctrl" onClick={() => loadTrack(Math.max(0, currentIdx - 1), isPlaying)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button className="mob-play" onClick={togglePlay}>
            {isPlaying ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button className="mob-ctrl" onClick={() => loadTrack(Math.min(tracks.length - 1, currentIdx + 1), isPlaying)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        {/* Track list */}
        <div className="mob-tracklist">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              className={`mob-track${i === currentIdx ? ' active' : ''}`}
              onClick={() => loadTrack(i, isPlaying)}
            >
              <span className="mob-track-num">{i + 1}</span>
              {i === currentIdx && (
                <span className="mob-wave">
                  <span /><span /><span />
                </span>
              )}
              <span className="mob-track-title">{track.title}</span>
            </div>
          ))}
        </div>
      </section>

      {album.youtube_url && (
        <section className="ts-youtube">
          <div className="ts-section-label"><span>Video</span></div>
          <div className="yt-outer">
            <a
              href={album.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="yt-thumbnail-link"
            >
              <div className="yt-frame">
                <img
                  src={album.youtube_thumbnail_url ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '')}
                  alt="YouTube video thumbnail"
                  className="yt-thumbnail-img"
                />
                <div className="yt-play-overlay">
                  <svg width="68" height="48" viewBox="0 0 68 48">
                    <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="red"/>
                    <path d="M45 24L27 14v20" fill="white"/>
                  </svg>
                </div>
              </div>
            </a>
          </div>
        </section>
      )}

      <section className="ts-instagram">
        <div className="ts-section-label"><span>Instagram</span></div>
        <behold-widget feed-id="1tcl1V4iTOeawn2PApns" />
        <Script src="https://w.behold.so/widget.js" strategy="afterInteractive" type="module" />
      </section>

      <audio ref={audioRef} preload="auto" />
    </div>
  )
}
