// app/edit/login/page.tsx
import BlobCanvas from '@/components/BlobCanvas'
import LoginGate from '@/components/LoginGate'

export default function LoginPage() {
  return (
    <>
      <BlobCanvas />
      <div id="grain" />
      <LoginGate />
    </>
  )
}
