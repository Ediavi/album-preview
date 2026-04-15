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

  return (
    <>
      <BlobCanvas />
      <div id="grain" />
      <PublicView album={album} tracks={tracks} />
    </>
  )
}
