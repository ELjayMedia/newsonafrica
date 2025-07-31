import { renderHook, act } from '@testing-library/react'
import { useNavigationRouting } from '../hooks/useNavigationRouting'
import { useRouter, usePathname } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

describe('useNavigationRouting', () => {
  it('navigates to country category path', () => {
    const push = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push })
    ;(usePathname as jest.Mock).mockReturnValue('/')

    const { result } = renderHook(() => useNavigationRouting())
    act(() => {
      result.current.navigateTo('sport', 'ng')
    })
    expect(push).toHaveBeenCalledWith('/ng/category/sport')
  })
})
