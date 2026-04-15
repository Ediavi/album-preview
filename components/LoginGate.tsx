// components/LoginGate.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginGate() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/edit')
    } else {
      setError('Mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      zIndex: 10,
    }}>
      <div className="glass panel" style={{ maxWidth: 400, width: '100%' }}>
        <div className="setup-header" style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22 }}>Album Preview</h1>
          <div className="sub" style={{ marginTop: 8 }}>Espace privé</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>MOT DE PASSE</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="warn-box" style={{ marginBottom: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            className="big-btn btn-launch"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Connexion…' : '→ Accéder'}
          </button>
        </form>
      </div>
    </div>
  )
}
