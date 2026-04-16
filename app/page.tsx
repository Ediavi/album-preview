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

  // Collect all media URLs for eager preloading
  const preloadUrls: { url: string; as: 'video' | 'audio' | 'image' }[] = []
  for (const t of tracks) {
    if (t.canvas_url) preloadUrls.push({ url: t.canvas_url, as: 'video' })
    if (t.audio_url) preloadUrls.push({ url: t.audio_url, as: 'audio' })
  }
  if (album.cover_url) preloadUrls.push({ url: album.cover_url, as: 'image' })

  return (
    <>
      {/* Server-rendered preload hints — browser starts fetching before JS hydrates */}
      {preloadUrls.map(({ url, as }) => (
        <link key={url} rel="preload" href={url} as={as} crossOrigin="anonymous" />
      ))}
      <BlobCanvas />
      <div id="grain" />
      <PublicView album={album} tracks={tracks} />
    </>
  )
}
