import { describe, it, expect, vi, beforeEach } from "vitest"

const mockCreateClient = vi.fn()
const mockUpdateUserProfile = vi.fn()
const mockRevalidateByTag = vi.fn()
const mockRevalidatePath = vi.fn()
const mockJsonWithCors = vi.fn(
  (_request: Request, data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json" },
    }),
)
const mockLogRequest = vi.fn()
const mockWriteFile = vi.fn(async () => {})
const mockMkdir = vi.fn(async () => {})
const mockExistsSync = vi.fn(() => true)

vi.mock("@/utils/supabase/server", () => ({
  createClient: mockCreateClient,
}))

vi.mock("@/lib/supabase", () => ({
  updateUserProfile: mockUpdateUserProfile,
}))

vi.mock("@/lib/server-cache-utils", () => ({
  revalidateByTag: mockRevalidateByTag,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/api-utils", () => ({
  jsonWithCors: mockJsonWithCors,
  logRequest: mockLogRequest,
}))

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
  return {
    ...actual,
    existsSync: mockExistsSync,
  }
})

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises")
  return {
    ...actual,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
  }
})

const routeModulePromise = import("./route")

describe("POST /api/user/upload-avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJsonWithCors.mockClear()
    mockJsonWithCors.mockImplementation(
      (_request: Request, data: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(data), {
          status: init?.status ?? 200,
          headers: { "content-type": "application/json" },
        }),
    )

    mockExistsSync.mockReturnValue(true)
  })

  it("stores the uploaded file and updates the Supabase profile avatar", async () => {
    const authGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    })

    mockCreateClient.mockReturnValue({
      auth: { getUser: authGetUser },
    })

    mockExistsSync.mockReturnValue(false)

    const { POST } = await routeModulePromise

    const file = {
      name: "avatar.png",
      arrayBuffer: async () => Buffer.from("avatar-bytes"),
    } as unknown as File
    const request = {
      method: "POST",
      url: "http://localhost/api/user/upload-avatar",
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue({
        get: (name: string) => (name === "file" ? file : null),
      } as unknown as FormData),
    } as unknown as Request

    mockUpdateUserProfile.mockResolvedValue({
      id: "user-123",
      avatar_url: "/uploads/custom-avatar.png",
    })

    const response = await POST(request)

    expect(mockUpdateUserProfile).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        avatar_url: expect.stringMatching(/^\/uploads\//),
      }),
    )

    expect(mockRevalidateByTag).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith("/profile")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      avatarUrl: "/uploads/custom-avatar.png",
    })
  })

  it("returns an error when the Supabase profile update fails", async () => {
    const authGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-456" } },
      error: null,
    })

    mockCreateClient.mockReturnValue({
      auth: { getUser: authGetUser },
    })

    mockExistsSync.mockReturnValue(true)

    const { POST } = await routeModulePromise

    const file = {
      name: "avatar.png",
      arrayBuffer: async () => Buffer.from("avatar-bytes"),
    } as unknown as File
    const request = {
      method: "POST",
      url: "http://localhost/api/user/upload-avatar",
      headers: new Headers(),
      formData: vi.fn().mockResolvedValue({
        get: (name: string) => (name === "file" ? file : null),
      } as unknown as FormData),
    } as unknown as Request

    mockUpdateUserProfile.mockRejectedValue(new Error("Profile update failed"))

    const response = await POST(request)

    expect(mockUpdateUserProfile).toHaveBeenCalledWith(
      "user-456",
      expect.objectContaining({
        avatar_url: expect.stringMatching(/^\/uploads\//),
      }),
    )

    expect(mockRevalidateByTag).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()

    expect(mockJsonWithCors).toHaveBeenCalledWith(
      request,
      { error: "Profile update failed" },
      { status: 502 },
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({ error: "Profile update failed" })
  })
})
