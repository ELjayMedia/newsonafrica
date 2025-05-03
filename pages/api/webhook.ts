import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { type, id } = req.body

    if (type === "post.updated" || type === "post.created") {
      const path = `/post/${id}`
      await res.revalidate(path)
      res.json({ revalidated: true, path })
    } else {
      res.json({ message: "No action taken" })
    }
  } else {
    res.setHeader("Allow", ["POST"])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
