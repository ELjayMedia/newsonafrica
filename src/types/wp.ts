import { z } from 'zod'

export const WpCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
})

export const WpPostSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.object({ rendered: z.string() }),
  content: z.object({ rendered: z.string() }).optional(),
  excerpt: z.object({ rendered: z.string() }).optional(),
  date: z.string(),
  categories: z.array(z.number()).optional(),
})

export type WpCategory = z.infer<typeof WpCategorySchema>
export type WpPost = z.infer<typeof WpPostSchema>
