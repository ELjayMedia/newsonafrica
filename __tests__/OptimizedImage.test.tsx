import React from "react"
import { render } from "@testing-library/react"
import { OptimizedImage } from "@/components/OptimizedImage"

// Mock next/image to avoid Next.js specific behaviour during tests
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, blurDataURL, placeholder, priority, ...props }: any) =>
    React.createElement("img", props),
}))

describe("OptimizedImage", () => {
  it("renders without crashing", () => {
    render(
      <OptimizedImage src="/placeholder.svg" alt="test" width={100} height={100} />,
    )
  })
})
