// app/api/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/next'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
  'video/mp4', 'video/quicktime',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
      }),
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
