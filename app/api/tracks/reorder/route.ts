// app/api/tracks/reorder/route.ts
import { NextResponse } from 'next/server'
import { reorderTracks } from '@/lib/db'

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: 'orderedIds array required' }, { status: 400 })
  }

  await reorderTracks({ orderedIds: body.orderedIds })
  return NextResponse.json({ ok: true })
}
