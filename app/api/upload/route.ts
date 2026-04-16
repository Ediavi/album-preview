// app/api/upload/route.ts
// Client-upload token handler — the browser uploads directly to Vercel Blob
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

const ALLOWED_TYPES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav',
  'video/mp4', 'video/quicktime',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
])

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const contentType = clientPayload ?? ''
        if (contentType && !ALLOWED_TYPES.has(contentType)) {
          throw new Error(`File type not allowed: ${contentType}`)
        }
        return {
          maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
          allowedContentTypes: [...ALLOWED_TYPES],
        }
      },
      onUploadCompleted: async () => {
        // nothing extra needed
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
