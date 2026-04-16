// lib/db.ts
import { sql } from '@vercel/postgres'
import type { AlbumRow, TrackRow, UpdateAlbumPayload, UpdateTrackPayload, ReorderPayload } from './types'

export async function getAlbum(): Promise<AlbumRow> {
  const result = await sql<AlbumRow>`SELECT * FROM album LIMIT 1`
  return result.rows[0]
}

export async function updateAlbum(payload: UpdateAlbumPayload): Promise<AlbumRow> {
  const result = await sql<AlbumRow>`
    UPDATE album SET
      ep_name          = COALESCE(${payload.ep_name         ?? null}, ep_name),
      artist           = COALESCE(${payload.artist          ?? null}, artist),
      description      = COALESCE(${payload.description     ?? null}, description),
      cover_url        = COALESCE(${payload.cover_url       ?? null}, cover_url),
      youtube_url      = COALESCE(${payload.youtube_url     ?? null}, youtube_url),
      youtube_thumbnail_url = COALESCE(${payload.youtube_thumbnail_url ?? null}, youtube_thumbnail_url),
      artist_instagram = COALESCE(${payload.artist_instagram ?? null}, artist_instagram),
      artist_post_url  = COALESCE(${payload.artist_post_url  ?? null}, artist_post_url),
      my_instagram     = COALESCE(${payload.my_instagram    ?? null}, my_instagram),
      my_post_url      = COALESCE(${payload.my_post_url     ?? null}, my_post_url)
    WHERE id = (SELECT id FROM album LIMIT 1)
    RETURNING *
  `
  return result.rows[0]
}

export async function getTracks(): Promise<TrackRow[]> {
  const result = await sql<TrackRow>`
    SELECT * FROM tracks
    WHERE album_id = (SELECT id FROM album LIMIT 1)
    ORDER BY position ASC
  `
  return result.rows
}

export async function createTrack(title: string): Promise<TrackRow> {
  const result = await sql<TrackRow>`
    INSERT INTO tracks (album_id, position, title)
    VALUES (
      (SELECT id FROM album LIMIT 1),
      (SELECT COALESCE(MAX(position), -1) + 1 FROM tracks WHERE album_id = (SELECT id FROM album LIMIT 1)),
      ${title}
    )
    RETURNING *
  `
  return result.rows[0]
}

export async function updateTrack(id: number, payload: UpdateTrackPayload): Promise<TrackRow> {
  const result = await sql<TrackRow>`
    UPDATE tracks SET
      title      = COALESCE(${payload.title      ?? null}, title),
      audio_url  = COALESCE(${payload.audio_url  ?? null}, audio_url),
      canvas_url = COALESCE(${payload.canvas_url ?? null}, canvas_url),
      cover_url  = COALESCE(${payload.cover_url  ?? null}, cover_url)
    WHERE id = ${id}
    RETURNING *
  `
  return result.rows[0]
}

export async function deleteTrack(id: number): Promise<void> {
  await sql`DELETE FROM tracks WHERE id = ${id}`
}

export async function reorderTracks(payload: ReorderPayload): Promise<void> {
  for (let i = 0; i < payload.orderedIds.length; i++) {
    await sql`UPDATE tracks SET position = ${i} WHERE id = ${payload.orderedIds[i]}`
  }
}
