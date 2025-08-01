import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SearchContent } from '../components/SearchContent'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('next/link', () => {
  return ({ children }: any) => <div>{children}</div>
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('SearchContent', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('only applies results from latest search', async () => {
    const first = deferred<any>()
    ;(global as any).fetch = jest
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              { id: 2, slug: 'banana', title: { rendered: 'Banana' }, excerpt: { rendered: '' } },
            ],
            total: 1,
            totalPages: 1,
            currentPage: 1,
            hasMore: false,
          }),
        }),
      )

    const { getByPlaceholderText, findByText, queryByText } = render(<SearchContent />)

    const input = getByPlaceholderText('Search articles, categories, and tags...')
    fireEvent.change(input, { target: { value: 'apple' } })
    fireEvent.submit(input.closest('form')!)

    fireEvent.change(input, { target: { value: 'banana' } })
    fireEvent.submit(input.closest('form')!)

    await findByText('Banana')

    first.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { id: 1, slug: 'apple', title: { rendered: 'Apple' }, excerpt: { rendered: '' } },
        ],
        total: 1,
        totalPages: 1,
        currentPage: 1,
        hasMore: false,
      }),
    })

    await new Promise((r) => setTimeout(r, 0))

    expect(queryByText('Banana')).toBeInTheDocument()
    expect(queryByText('Apple')).toBeNull()
  })
})
