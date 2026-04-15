// components/EditView.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AlbumRow, TrackRow } from '@/lib/types'
import TrackCard from './TrackCard'

interface Props {
  initialAlbum: AlbumRow
  initialTracks: TrackRow[]
}

export default function EditView({ initialAlbum, initialTracks }: Props) {
  const [album, setAlbum] = useState<AlbumRow>(initialAlbum)
  const [tracks, setTracks] = useState<TrackRow[]>(initialTracks)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const router = useRouter()

  const updateAlbumField = (field: keyof AlbumRow, value: string) => {
    setAlbum(a => ({ ...a, [field]: value }))
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-content-type': file.type, 'x-filename': file.name },
        body: file,
      })
      const { url } = await res.json()
      setAlbum(a => ({ ...a, cover_url: url }))
    } catch (err) {
      console.error('Upload failed', err)
    }
    setCoverUploading(false)
    e.target.value = ''
  }

  const saveAll = async () => {
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(album),
    })
    await Promise.all(
      tracks.map(t =>
        fetch(`/api/tracks/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t.title }),
        })
      )
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const addTrack = async () => {
    const res = await fetch('/api/tracks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    })
    if (res.ok) {
      const track = await res.json()
      setTracks(t => [...t, track])
    }
  }

  const deleteTrack = async (id: number) => {
    await fetch(`/api/tracks/${id}`, { method: 'DELETE' })
    setTracks(t => t.filter(track => track.id !== id))
  }

  const handleTitleChange = (id: number, title: string) => {
    setTracks(t => t.map(track => track.id === id ? { ...track, title } : track))
  }

  const handleFileUploaded = (id: number, field: 'audio_url' | 'canvas_url' | 'cover_url', url: string) => {
    setTracks(t => t.map(track => track.id === id ? { ...track, [field]: url } : track))
  }

  const handleFileCleared = (id: number, field: 'audio_url' | 'canvas_url' | 'cover_url') => {
    setTracks(t => t.map(track => track.id === id ? { ...track, [field]: null } : track))
  }

  const handleDrop = useCallback(async (targetId: number) => {
    if (!dragId || dragId === targetId) return
    const oldOrder = tracks.map(t => t.id)
    const fromIdx = oldOrder.indexOf(dragId)
    const toIdx = oldOrder.indexOf(targetId)
    const newOrder = [...oldOrder]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragId)
    const reordered = newOrder.map(id => tracks.find(t => t.id === id)!)
    setTracks(reordered)
    setDragId(null)
    setDragOverId(null)
    await fetch('/api/tracks/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newOrder }),
    })
  }, [dragId, tracks])

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/edit/login')
  }

  return (
    <div id="setup" style={{ position: 'relative', zIndex: 10, padding: '36px 20px 80px', minHeight: '100vh' }}>
      <div className="setup-header" style={{ position: 'relative' }}>
        <h1>Album Preview</h1>
        <div className="sub">Setup — espace privé</div>
        <button
          onClick={logout}
          style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 9, padding: '6px 14px', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 12 }}
        >
          Déconnexion
        </button>
      </div>

      {/* EP INFO */}
      <div className="sec-label"><span>L&apos;EP</span></div>
      <div className="glass panel">
        <div className="panel-title">Infos de l&apos;EP</div>
        <div className="fields-row">
          <div className="field">
            <label>NOM DE L&apos;EP</label>
            <input type="text" value={album.ep_name} onChange={e => updateAlbumField('ep_name', e.target.value)} placeholder="Mon EP" />
          </div>
          <div className="field">
            <label>ARTISTE</label>
            <input type="text" value={album.artist} onChange={e => updateAlbumField('artist', e.target.value)} placeholder="Nom d'artiste" />
          </div>
        </div>
        <div className="field">
          <label>DESCRIPTION / BIO</label>
          <textarea value={album.description ?? ''} onChange={e => updateAlbumField('description', e.target.value)} placeholder="Parle de l'album, de l'univers, du propos…" />
        </div>
        <div className="field">
          <label>ARTWORK (couverture de l&apos;album)</label>
          <label className="file-btn">
            🖼 Choisir une image
            <input type="file" accept="image/*" hidden onChange={handleCoverChange} />
          </label>
          <span className={`fst${album.cover_url ? ' ok' : ''}`}>
            {coverUploading ? 'Upload…' : (album.cover_url ? '✓ Image OK' : 'aucune image')}
          </span>
          {album.cover_url && !coverUploading && (
            <button
              className="tc-rm"
              title="Supprimer la couverture"
              onClick={() => setAlbum(a => ({ ...a, cover_url: null }))}
            >×</button>
          )}
          {album.cover_url && (
            <img src={album.cover_url} alt="cover preview" className="artwork-preview" style={{ display: 'inline-block' }} />
          )}
        </div>
      </div>

      {/* TRACKS */}
      <div className="sec-label"><span>Morceaux</span></div>
      <div className="glass panel">
        <div className="panel-title">Tracks</div>
        <div id="track-list">
          {tracks.map((track, i) => (
            <TrackCard
              key={track.id}
              track={track}
              index={i}
              onTitleChange={handleTitleChange}
              onFileUploaded={handleFileUploaded}
              onFileCleared={handleFileCleared}
              onDelete={deleteTrack}
              onDragStart={id => setDragId(id)}
              onDragOver={id => setDragOverId(id)}
              onDrop={handleDrop}
              isDragging={dragId === track.id}
              isDragOver={dragOverId === track.id}
            />
          ))}
        </div>
        <button className="big-btn btn-add" onClick={addTrack} style={{ width: '100%', marginTop: 8, textAlign: 'center' }}>
          + Ajouter un morceau
        </button>
      </div>

      {/* LINKS */}
      <div className="sec-label"><span>Liens</span></div>
      <div className="glass panel">
        <div className="panel-title">YouTube &amp; Instagram</div>
        <div className="field">
          <label>LIEN YOUTUBE</label>
          <input type="text" value={album.youtube_url ?? ''} onChange={e => updateAlbumField('youtube_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div className="ig-setup-group">
          <div className="ig-setup-group-title">📷 Instagram — Artiste</div>
          <div className="fields-row">
            <div className="field">
              <label>HANDLE</label>
              <input type="text" value={album.artist_instagram ?? ''} onChange={e => updateAlbumField('artist_instagram', e.target.value)} placeholder="@handle" />
            </div>
          </div>
        </div>
        <div className="ig-setup-group">
          <div className="ig-setup-group-title">📷 Instagram — Management</div>
          <div className="fields-row">
            <div className="field">
              <label>HANDLE</label>
              <input type="text" value={album.my_instagram ?? ''} onChange={e => updateAlbumField('my_instagram', e.target.value)} placeholder="@handle" />
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="btn-row">
        <button className={`big-btn btn-save${saved ? ' saved' : ''}`} onClick={saveAll} disabled={saving}>
          {saved ? '✓ Sauvegardé' : saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
        </button>
        <a className="big-btn btn-launch" href="/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          ▶ Voir le résultat
        </a>
      </div>
    </div>
  )
}
