// __tests__/api/config.test.ts
const mockSession = { isLoggedIn: true, save: jest.fn(), destroy: jest.fn() }

jest.mock('iron-session', () => ({
  getIronSession: jest.fn().mockResolvedValue(mockSession),
}))
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}))

const mockAlbum = { id: 1, ep_name: 'My EP', artist: 'DJ Test', description: '' }
jest.mock('@/lib/db', () => ({
  getAlbum: jest.fn().mockResolvedValue(mockAlbum),
  updateAlbum: jest.fn().mockResolvedValue({ ...mockAlbum, ep_name: 'Updated EP' }),
}))

import { GET, PUT } from '@/app/api/config/route'

beforeEach(() => jest.clearAllMocks())

describe('GET /api/config', () => {
  it('returns the album data', async () => {
    const req = new Request('http://localhost/api/config')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ep_name).toBe('My EP')
  })
})

describe('PUT /api/config', () => {
  it('returns 401 when not logged in', async () => {
    mockSession.isLoggedIn = false
    const req = new Request('http://localhost/api/config', {
      method: 'PUT',
      body: JSON.stringify({ ep_name: 'Updated EP' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('updates and returns album when logged in', async () => {
    mockSession.isLoggedIn = true
    const req = new Request('http://localhost/api/config', {
      method: 'PUT',
      body: JSON.stringify({ ep_name: 'Updated EP' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ep_name).toBe('Updated EP')
  })
})
