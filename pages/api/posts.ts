import type { NextApiRequest, NextApiResponse } from "next"
import { setCacheHeaders } from "@/lib/api-utils"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCacheHeaders(res)
  // Rest of your code
  res.status(200).json({ name: "John Doe" })
}
