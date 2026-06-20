import { describe, expect, it } from "vitest"

import { POST_FIELDS_FRAGMENT, POST_SUMMARY_FIELDS_FRAGMENT } from "@/lib/wordpress/queries"

describe("wordpress post fragments", () => {
  it("omits heavy fields from the summary fragment", () => {
    expect(POST_SUMMARY_FIELDS_FRAGMENT).not.toContain("content")
  })

  it("retains full fields for the detailed fragment", () => {
    expect(POST_FIELDS_FRAGMENT).toContain("content")
  })
})
