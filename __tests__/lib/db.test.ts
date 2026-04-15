// __tests__/lib/db.test.ts
const mockQueryResult = (rows: unknown[]) => Promise.resolve({ rows })

const mockSql = jest.fn().mockImplementation((_strings: TemplateStringsArray, ..._values: unknown[]) =>
  mockQueryResult([])
)

jest.mock('@vercel/postgres', () => ({ sql: mockSql }))

import { getAlbum, getTracks, createTrack, deleteTrack } from '@/lib/db'

beforeEach(() => jest.clearAllMocks())

describe('getAlbum', () => {
  it('returns the first album row', async () => {
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1, ep_name: 'Test EP', artist: 'DJ Test' }] })
    const album = await getAlbum()
    expect(album.ep_name).toBe('Test EP')
    expect(album.artist).toBe('DJ Test')
  })
})

describe('getTracks', () => {
  it('returns all track rows ordered by position', async () => {
    const rows = [
      { id: 1, position: 0, title: 'Track A' },
      { id: 2, position: 1, title: 'Track B' },
    ]
    mockSql.mockResolvedValueOnce({ rows })
    const tracks = await getTracks()
    expect(tracks).toHaveLength(2)
    expect(tracks[0].title).toBe('Track A')
  })
})

describe('createTrack', () => {
  it('returns the newly created track', async () => {
    mockSql.mockResolvedValueOnce({ rows: [{ id: 3, title: 'New Track', position: 2 }] })
    const track = await createTrack('New Track')
    expect(track.id).toBe(3)
    expect(track.title).toBe('New Track')
  })
})

describe('deleteTrack', () => {
  it('calls sql without throwing', async () => {
    mockSql.mockResolvedValueOnce({ rows: [] })
    await expect(deleteTrack(1)).resolves.toBeUndefined()
  })
})
