import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import React from 'react'

function ExampleComponent() {
  return <div>Hello World</div>
}

describe('ExampleComponent', () => {
  it('renders greeting', () => {
    render(<ExampleComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})

