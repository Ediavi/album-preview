// app/api/tracks/[id]/route.ts
import { NextResponse } from 'next/server'
import { updateTrack, deleteTrack } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const track = await updateTrack(Number(id), body)
  return NextResponse.json(track)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  await deleteTrack(Number(id))
  return NextResponse.json({ ok: true })
}
