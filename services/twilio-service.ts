import Twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

if (!accountSid || !authToken || !verifyServiceSid) {
  throw new Error("Missing Twilio environment variables")
}

const client = Twilio(accountSid, authToken)

export async function sendPhoneOtp(phone: string) {
  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" })
    return verification.status === "pending"
  } catch (error) {
    console.error("Error sending phone OTP:", error)
    return false
  }
}

export async function verifyPhoneOtp(phone: string, code: string) {
  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code })
    return verification.status === "approved"
  } catch (error) {
    console.error("Error verifying phone OTP:", error)
    return false
  }
}
