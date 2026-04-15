// app/api/auth/route.ts
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/auth'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  if (!safeCompare(body.password, adminPassword)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.isLoggedIn = true
  await session.save()

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  await session.destroy()
  return NextResponse.json({ ok: true })
}
