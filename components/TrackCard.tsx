// components/TrackCard.tsx
'use client'

import { useState } from 'react'
import type { TrackRow } from '@/lib/types'

interface Props {
  track: TrackRow
  index: number
  onTitleChange: (id: number, title: string) => void
  onFileUploaded: (id: number, field: 'audio_url' | 'canvas_url' | 'cover_url', url: string) => void
  onFileCleared: (id: number, field: 'audio_url' | 'canvas_url' | 'cover_url') => void
  onDelete: (id: number) => void
  onDragStart: (id: number) => void
  onDragOver: (id: number) => void
  onDrop: (targetId: number) => void
  isDragging: boolean
  isDragOver: boolean
}

export default function TrackCard({
  track, index, onTitleChange, onFileUploaded, onFileCleared, onDelete,
  onDragStart, onDragOver, onDrop, isDragging, isDragOver,
}: Props) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'audio_url' | 'canvas_url' | 'cover_url'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(u => ({ ...u, [field]: true }))

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-content-type': file.type, 'x-filename': file.name },
        body: file,
      })
      const { url } = await res.json()
      await fetch(`/api/tracks/${track.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: url }),
      })
      onFileUploaded(track.id, field, url)
    } catch (err) {
      console.error('Upload failed', err)
    }
    setUploading(u => ({ ...u, [field]: false }))
    e.target.value = ''
  }

  const handleFileClear = async (field: 'audio_url' | 'canvas_url' | 'cover_url') => {
    await fetch(`/api/tracks/${track.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: null }),
    })
    onFileCleared(track.id, field)
  }

  const className = [
    'tc',
    isDragging ? 'dragging' : '',
    isDragOver ? 'drag-over' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={className}
      draggable
      onDragStart={() => onDragStart(track.id)}
      onDragOver={e => { e.preventDefault(); onDragOver(track.id) }}
      onDrop={e => { e.preventDefault(); onDrop(track.id) }}
      onDragLeave={() => onDragOver(-1)}
    >
      <div className="tc-head">
        <span className="drag-handle">⠿</span>
        <span className="tc-num">{index + 1}</span>
        <input
          className="tc-title"
          type="text"
          placeholder="Titre du morceau"
          defaultValue={track.title}
          onChange={e => onTitleChange(track.id, e.target.value)}
        />
        <button className="tc-rm" onClick={() => onDelete(track.id)}>×</button>
      </div>

      <div className="tc-files">
        <label className="file-btn">
          🎵 Audio
          <input type="file" accept="audio/*" hidden onChange={e => handleFileChange(e, 'audio_url')} />
        </label>
        <span className={`fst${track.audio_url ? ' ok' : ''}`}>
          {uploading.audio_url ? 'Upload…' : (track.audio_url ? '✓ Fichier OK' : 'aucun')}
        </span>
        {track.audio_url && !uploading.audio_url && (
          <button className="tc-rm" title="Supprimer le fichier" onClick={() => handleFileClear('audio_url')}>×</button>
        )}

        <label className="file-btn" style={{ marginLeft: 8 }}>
          🎬 Vidéo canvas
          <input type="file" accept="video/*,.mov,.MOV" hidden onChange={e => handleFileChange(e, 'canvas_url')} />
        </label>
        <span className={`fst${track.canvas_url ? ' ok' : ''}`}>
          {uploading.canvas_url ? 'Upload…' : (track.canvas_url ? '✓ Fichier OK' : 'aucune')}
        </span>
        {track.canvas_url && !uploading.canvas_url && (
          <button className="tc-rm" title="Supprimer le fichier" onClick={() => handleFileClear('canvas_url')}>×</button>
        )}

        <label className="file-btn" style={{ marginLeft: 8 }}>
          🖼 Cover (opt.)
          <input type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'cover_url')} />
        </label>
        <span className={`fst${track.cover_url ? ' ok' : ''}`}>
          {uploading.cover_url ? 'Upload…' : (track.cover_url ? '✓ Fichier OK' : 'aucune')}
        </span>
        {track.cover_url && !uploading.cover_url && (
          <button className="tc-rm" title="Supprimer le fichier" onClick={() => handleFileClear('cover_url')}>×</button>
        )}
      </div>
    </div>
  )
}
