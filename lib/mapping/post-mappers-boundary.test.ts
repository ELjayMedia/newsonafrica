import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("post mapper client/server boundaries", () => {
  it("shared mapper stays client-safe", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/mapping/post-mappers.shared.ts"), "utf8")

    expect(source).not.toContain('import "server-only"')
    expect(source).not.toContain("normalize-post-content")
  })

  it("server mapper is explicitly server-only", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/mapping/post-mappers.server.ts"), "utf8")

    expect(source).toContain('import "server-only"')
    expect(source).toContain("normalize-post-content")
  })
})
