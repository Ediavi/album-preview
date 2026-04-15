// __tests__/api/auth.test.ts
const mockSession = {
  isLoggedIn: false,
  save: jest.fn(),
  destroy: jest.fn(),
}

jest.mock('iron-session', () => ({
  getIronSession: jest.fn().mockResolvedValue(mockSession),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}))

import { POST, DELETE } from '@/app/api/auth/route'

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.isLoggedIn = false
  process.env.ADMIN_PASSWORD = 'correct-password'
})

describe('POST /api/auth', () => {
  it('returns 401 for wrong password', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(mockSession.save).not.toHaveBeenCalled()
  })

  it('returns 200 and saves session for correct password', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password: 'correct-password' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockSession.isLoggedIn).toBe(true)
    expect(mockSession.save).toHaveBeenCalled()
  })

  it('returns 400 if password field is missing', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/auth', () => {
  it('destroys the session and returns 200', async () => {
    const req = new Request('http://localhost/api/auth', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(mockSession.destroy).toHaveBeenCalled()
  })
})
