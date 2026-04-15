// app/edit/page.tsx
import { getAlbum, getTracks } from '@/lib/db'
import EditView from '@/components/EditView'
import BlobCanvas from '@/components/BlobCanvas'

export const revalidate = 0

export default async function EditPage() {
  const [album, tracks] = await Promise.all([getAlbum(), getTracks()])
  return (
    <>
      <BlobCanvas />
      <div id="grain" />
      <EditView initialAlbum={album} initialTracks={tracks} />
    </>
  )
}
