// __tests__/api/tracks.test.ts
const mockSession = { isLoggedIn: true }

jest.mock('iron-session', () => ({
  getIronSession: jest.fn().mockResolvedValue(mockSession),
}))
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}))

const mockTracks = [
  { id: 1, position: 0, title: 'Track A', album_id: 1 },
  { id: 2, position: 1, title: 'Track B', album_id: 1 },
]
jest.mock('@/lib/db', () => ({
  getTracks: jest.fn().mockResolvedValue(mockTracks),
  createTrack: jest.fn().mockResolvedValue({ id: 3, position: 2, title: 'New Track', album_id: 1 }),
  updateTrack: jest.fn().mockResolvedValue({ id: 1, position: 0, title: 'Updated', album_id: 1 }),
  deleteTrack: jest.fn().mockResolvedValue(undefined),
  reorderTracks: jest.fn().mockResolvedValue(undefined),
}))

import { GET as getAll, POST } from '@/app/api/tracks/route'
import { PUT, DELETE } from '@/app/api/tracks/[id]/route'
import { PUT as reorder } from '@/app/api/tracks/reorder/route'

beforeEach(() => jest.clearAllMocks())

describe('GET /api/tracks', () => {
  it('returns all tracks', async () => {
    const res = await getAll(new Request('http://localhost/api/tracks'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(2)
  })
})

describe('POST /api/tracks', () => {
  it('creates a track and returns 201', async () => {
    const req = new Request('http://localhost/api/tracks', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Track' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe(3)
  })

  it('returns 401 when not logged in', async () => {
    mockSession.isLoggedIn = false
    const req = new Request('http://localhost/api/tracks', {
      method: 'POST',
      body: JSON.stringify({ title: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    mockSession.isLoggedIn = true
  })
})

describe('PUT /api/tracks/[id]', () => {
  it('updates a track and returns 200', async () => {
    const req = new Request('http://localhost/api/tracks/1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/tracks/[id]', () => {
  it('deletes a track and returns 200', async () => {
    const req = new Request('http://localhost/api/tracks/1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/tracks/reorder', () => {
  it('reorders tracks and returns 200', async () => {
    const req = new Request('http://localhost/api/tracks/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds: [2, 1] }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await reorder(req)
    expect(res.status).toBe(200)
  })
})
