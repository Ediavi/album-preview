// app/api/tracks/route.ts
import { NextResponse } from 'next/server'
import { getTracks, createTrack } from '@/lib/db'

export async function GET(_request: Request) {
  const tracks = await getTracks()
  return NextResponse.json(tracks)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const track = await createTrack(body.title)
  return NextResponse.json(track, { status: 201 })
}
