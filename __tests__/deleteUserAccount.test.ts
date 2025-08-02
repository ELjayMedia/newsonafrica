process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { admin: { deleteUser: jest.fn() } },
    from: jest.fn(),
  })),
}))

const deleteUserMock = jest.fn().mockResolvedValue({ error: null })
const eqMock = jest.fn().mockResolvedValue({ error: null })
const deleteMock = jest.fn(() => ({ eq: eqMock }))
const fromMock = jest.fn(() => ({ delete: deleteMock }))

const adminClient = {
  auth: { admin: { deleteUser: deleteUserMock } },
  from: fromMock,
} as any

const { deleteUserAccount } = require('../lib/api/supabase')

test('deleteUserAccount removes auth user and profile', async () => {
  const result = await deleteUserAccount('user123', adminClient)
  expect(deleteUserMock).toHaveBeenCalledWith('user123')
  expect(fromMock).toHaveBeenCalledWith('profiles')
  expect(deleteMock).toHaveBeenCalled()
  expect(eqMock).toHaveBeenCalledWith('id', 'user123')
  expect(result).toEqual({ data: null, error: null, success: true })
})
