import { NextResponse } from "next/server"
import { z } from "zod"
import { sendPhoneOtp } from "@/services/twilio-service"

const sendSchema = z.object({
  phone: z.string().min(6, "Phone number is required"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = sendSchema.parse(body)

    const success = await sendPhoneOtp(phone)
    if (!success) {
      return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
