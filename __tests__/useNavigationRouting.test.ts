import { renderHook, act } from '@testing-library/react'
import { useNavigationRouting } from '../hooks/useNavigationRouting'
import { getCountryEndpoints } from '../lib/getCountryEndpoints'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/ng',
}))

describe('useNavigationRouting', () => {
  it('pushes country path with provided code', () => {
    const push = jest.fn()
    ;(require('next/navigation').useRouter as any).mockReturnValue({ push })
    const { result } = renderHook(() => useNavigationRouting())
    act(() => result.current.navigateTo('news', 'ke'))
    expect(push).toHaveBeenCalledWith('/ke/category/news')
  })
})

describe('getCountryEndpoints', () => {
  it('resolves urls by code', () => {
    const ep = getCountryEndpoints('za')
    expect(ep.graphql).toContain('/za/graphql')
    expect(ep.rest).toContain('/za/wp-json')
  })
})
