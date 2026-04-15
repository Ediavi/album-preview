// app/api/tracks/route.ts
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/auth'
import { getTracks, createTrack } from '@/lib/db'

export async function GET(_request: Request) {
  const tracks = await getTracks()
  return NextResponse.json(tracks)
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const track = await createTrack(body.title)
  return NextResponse.json(track, { status: 201 })
}
