import { z } from 'zod'

export const wpCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
})

export const wpPostSchema = z.object({
  id: z.number(),
  date: z.string(),
  title: z.object({ rendered: z.string() }),
  link: z.string().url(),
  categories: z.array(z.number()),
})

export type WPCategory = z.infer<typeof wpCategorySchema>
export type WPPost = z.infer<typeof wpPostSchema>
