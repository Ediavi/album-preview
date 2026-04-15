// lib/auth.ts
import type { SessionOptions } from 'iron-session'

export interface SessionData {
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'album_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
  },
}
