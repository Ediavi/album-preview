// components/PublicView.tsx
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
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

  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentTrack = tracks[currentIdx] ?? null

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
    const video = videoRef.current
    if (!video) return
    if (track.canvas_url) {
      video.src = track.canvas_url
      video.load()
      video.play().catch(() => {})
    } else {
      video.pause()
      video.src = ''
    }
  }, [tracks])

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
    const onPlay = () => { setIsPlaying(true); videoRef.current?.play().catch(() => {}) }
    const onPause = () => { setIsPlaying(false); videoRef.current?.pause() }
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
  }, [currentIdx, tracks, loadTrack])

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

  return (
    <div id="theshow" style={{ display: 'block' }}>
      {/* HERO */}
      <section className="ts-hero">
        <div
          className="ts-hero-bg"
          style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
        />
        <div className="ts-hero-content">
          <div className="ts-artwork-wrap">
            {coverSrc ? (
              <img className="ts-artwork" src={coverSrc} alt="artwork" />
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
      </section>

      {/* TRACKS */}
      <section className="ts-tracks">
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
            <video
              ref={videoRef}
              className="canvas-video"
              loop
              muted
              playsInline
              preload="none"
            />
            <div className="screen-overlay" />
            <div className="dynamic-island" />
            <div className="status-bar">
              <span className="clk">{phoneTime}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>▪▪▪ WiFi 🔋</span>
            </div>
            <div className="sp-top">
              <span style={{ fontSize: 28, opacity: 0.9 }}>‹</span>
              <div className="sp-ep-lbl">
                Lecture depuis l&apos;EP<b>{album.ep_name || '—'}</b>
              </div>
              <span className="sp-menu">⋮</span>
            </div>
            <div className="sp-bottom">
              <div className="sp-like-row">
                <div className="sp-song-info">
                  <div className="sp-title">{currentTrack?.title || '—'}</div>
                  <div className="sp-artist-name">{album.artist || '—'}</div>
                </div>
                <span className="sp-heart">♡</span>
              </div>
              <div className="sp-bar" onClick={handleSeek}>
                <div className="sp-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="sp-times">
                <span>{currentTime}</span>
                <span>{duration}</span>
              </div>
              <div className="sp-ctrls">
                <button onClick={() => loadTrack(Math.max(0, currentIdx - 1), isPlaying)}>⏮</button>
                <button className="sp-play-btn" id="sp_play" onClick={togglePlay}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={() => loadTrack(Math.min(tracks.length - 1, currentIdx + 1), isPlaying)}>⏭</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, gap: 8, alignItems: 'center' }}>
                <button
                  onClick={toggleMute}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, opacity: 0.7 }}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={handleVolumeChange}
                  style={{ width: 80 }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {ytId && (
        <section className="ts-youtube">
          <div className="ts-section-label"><span>Vidéo</span></div>
          <div className="yt-outer">
            <div className="yt-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&color=white`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>
      )}

      {(album.artist_instagram || album.my_instagram) && (
        <section className="ts-instagram">
          <div className="ts-section-label"><span>Suivre</span></div>
          <div className="ig-section-inner">
            <div className="ig-accounts">
              {album.artist_instagram && (
                <div className="ig-account">
                  <div className="ig-account-label">Artiste</div>
                  <a
                    href={`https://instagram.com/${album.artist_instagram.replace('@', '')}`}
                    className="ig-profile-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="ig-icon-wrap">📷</div>
                    <div className="ig-profile-info">
                      <div className="ig-profile-lbl">Instagram</div>
                      <div className="ig-profile-handle">{album.artist_instagram}</div>
                    </div>
                  </a>
                </div>
              )}
              {album.my_instagram && (
                <div className="ig-account">
                  <div className="ig-account-label">Management</div>
                  <a
                    href={`https://instagram.com/${album.my_instagram.replace('@', '')}`}
                    className="ig-profile-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="ig-icon-wrap">📷</div>
                    <div className="ig-profile-info">
                      <div className="ig-profile-lbl">Instagram</div>
                      <div className="ig-profile-handle">{album.my_instagram}</div>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <audio ref={audioRef} preload="none" />
    </div>
  )
}
