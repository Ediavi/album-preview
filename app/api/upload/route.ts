// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

const ALLOWED_TYPES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
  'video/mp4', 'video/quicktime',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
])

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const contentType = request.headers.get('x-content-type') ?? ''
  const filename = request.headers.get('x-filename') ?? 'upload'

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: `File type not allowed: ${contentType}` }, { status: 415 })
  }

  if (!request.body) {
    return NextResponse.json({ error: 'No body' }, { status: 400 })
  }

  const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const blob = await put(safeName, request.body, {
    access: 'public',
    contentType,
  })

  return NextResponse.json({ url: blob.url })
}
