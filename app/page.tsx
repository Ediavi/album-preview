// app/page.tsx
import { getAlbum, getTracks } from '@/lib/db'
import PublicView from '@/components/PublicView'
import BlobCanvas from '@/components/BlobCanvas'

export const revalidate = 0 // always fetch fresh data

export default async function Home() {
  const [album, tracks] = await Promise.all([getAlbum(), getTracks()])

  if (!album) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
        <p>No album data yet. <a href="/edit" style={{ color: '#8ab4f8' }}>Set it up here.</a></p>
      </main>
    )
  }

  // Collect media URLs — images first (highest priority), then audio, then video
  const imageUrls: string[] = []
  const audioUrls: string[] = []
  const videoUrls: string[] = []
  if (album.cover_url) imageUrls.push(album.cover_url)
  for (const t of tracks) {
    if (t.cover_url && !imageUrls.includes(t.cover_url)) imageUrls.push(t.cover_url)
    if (t.audio_url) audioUrls.push(t.audio_url)
    if (t.canvas_url) videoUrls.push(t.canvas_url)
  }

  return (
    <>
      {/* Cover images first — fetchpriority high so they render instantly */}
      {imageUrls.map((url) => (
        <link key={url} rel="preload" href={url} as="image" fetchPriority="high" crossOrigin="anonymous" />
      ))}
      {/* Audio next */}
      {audioUrls.map((url) => (
        <link key={url} rel="preload" href={url} as="fetch" crossOrigin="anonymous" />
      ))}
      {/* Videos last — largest files, lowest priority */}
      {videoUrls.map((url) => (
        <link key={url} rel="preload" href={url} as="video" crossOrigin="anonymous" />
      ))}
      <BlobCanvas />
      <div id="grain" />
      <PublicView album={album} tracks={tracks} />
    </>
  )
}
