import { renderHook, act } from '@testing-library/react'
import { useNavigationRouting } from '../hooks/useNavigationRouting'
import { getCountryEndpoints } from '../lib/getCountryEndpoints'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/ng',
}))
const { useRouter } = require('next/navigation') as { useRouter: jest.Mock }

describe('useNavigationRouting', () => {
  it('pushes country path with provided code', () => {
    const push = jest.fn()
    useRouter.mockReturnValue({ push })
    const { result } = renderHook(() => useNavigationRouting())
    act(() => result.current.navigateTo('news', 'ke'))
    expect(push).toHaveBeenCalledWith('/ke/category/news')
  })
})

describe('getCountryEndpoints', () => {
  it('resolves urls by code', () => {
    const ep = getCountryEndpoints('za')
    expect(ep.graphql).toContain('/za/graphql')
    expect(ep.rest).toContain('/za')
    expect(ep.rest).not.toContain('wp-json')
  })
})
