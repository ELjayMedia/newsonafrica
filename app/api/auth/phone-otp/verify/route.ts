import { NextResponse } from "next/server"
import { z } from "zod"
import { verifyPhoneOtp } from "@/services/twilio-service"

const verifySchema = z.object({
  phone: z.string().min(6, "Phone number is required"),
  code: z.string().min(1, "Code is required"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, code } = verifySchema.parse(body)

    const verified = await verifyPhoneOtp(phone, code)
    return NextResponse.json({ verified })
  } catch (error) {
    console.error("Verify OTP error:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
