import { jest } from "@jest/globals"

const singleMock = jest.fn()
const eqMock = jest.fn(() => ({ single: singleMock }))
const selectMock = jest.fn(() => ({ eq: eqMock }))
const fromMock = jest.fn(() => ({ select: selectMock }))

jest.mock("@/lib/supabase", () => ({
  supabase: { from: fromMock },
}))

const updateRecordMock = jest.fn()
jest.mock("@/utils/supabase-query-utils", () => ({
  updateRecord: updateRecordMock,
}))

import { markNotificationAsRead } from "../services/notification-service"

describe("markNotificationAsRead", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns false and logs when lookup fails", async () => {
    const error = { message: "not found" }
    singleMock.mockResolvedValueOnce({ data: null, error })
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    const result = await markNotificationAsRead("123")

    expect(result).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith("Error fetching notification:", error)
    expect(updateRecordMock).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })
})

