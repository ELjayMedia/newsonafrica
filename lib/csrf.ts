import { env } from '@/lib/config/env';
import type { NextApiRequest, NextApiResponse } from "next"
import Tokens from "csrf"

const tokens = new Tokens()

export function csrf(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  if (!req.cookies["csrf-token"]) {
    const secret = env.CSRF_SECRET
    if (!secret) {
      throw new Error("CSRF_SECRET is not set in environment variables")
    }
    const token = tokens.create(secret)
    res.setHeader("Set-Cookie", `csrf-token=${token}; HttpOnly; Path=/; SameSite=Strict`)
  }
  next()
}

export function validateCsrf(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const token = req.cookies["csrf-token"]
  const csrfToken = req.headers["x-csrf-token"]
  const secret = env.CSRF_SECRET

  if (!secret) {
    throw new Error("CSRF_SECRET is not set in environment variables")
  }

  if (!token || !csrfToken || !tokens.verify(secret, csrfToken as string)) {
    return res.status(403).json({ error: "Invalid CSRF token" })
  }

  next()
}
