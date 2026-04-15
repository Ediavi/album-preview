// app/api/config/route.ts
import { NextResponse } from 'next/server'
import { getAlbum, updateAlbum } from '@/lib/db'

export async function GET(_request: Request) {
  const album = await getAlbum()
  return NextResponse.json(album)
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const updated = await updateAlbum(body)
  return NextResponse.json(updated)
}
