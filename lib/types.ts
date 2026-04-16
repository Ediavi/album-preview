// lib/types.ts

export interface AlbumRow {
  id: number
  ep_name: string
  artist: string
  description: string
  cover_url: string | null
  youtube_url: string | null
  youtube_thumbnail_url: string | null
  artist_instagram: string | null
  artist_post_url: string | null
  my_instagram: string | null
  my_post_url: string | null
}

export interface TrackRow {
  id: number
  album_id: number
  position: number
  title: string
  audio_url: string | null
  canvas_url: string | null
  cover_url: string | null
}

// Payload shapes used by API routes
export interface UpdateAlbumPayload {
  ep_name?: string
  artist?: string
  description?: string
  cover_url?: string | null
  youtube_url?: string | null
  youtube_thumbnail_url?: string | null
  artist_instagram?: string | null
  artist_post_url?: string | null
  my_instagram?: string | null
  my_post_url?: string | null
}

export interface CreateTrackPayload {
  title: string
}

export interface UpdateTrackPayload {
  title?: string
  audio_url?: string | null
  canvas_url?: string | null
  cover_url?: string | null
}

export interface ReorderPayload {
  orderedIds: number[]
}
