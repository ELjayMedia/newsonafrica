/**
 * Zod schemas for the comment actions (NOA-101). Client-safe (no
 * server-only imports) — mirrors the `lib/auth/validation.ts` convention so
 * forms and server actions validate identically.
 */
import { z } from "zod";

import { isValidCountry } from "@/lib/countries";

export const COMMENT_MAX_LENGTH = 4000;

export const commentBodySchema = z
  .string({ required_error: "Write a comment first" })
  .trim()
  .min(1, "Write a comment first")
  .max(COMMENT_MAX_LENGTH, `Comments are limited to ${COMMENT_MAX_LENGTH} characters`);

const articleSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/i, "Invalid article");

export const postCommentSchema = z.object({
  country: z.string().refine(isValidCountry, "Unsupported country"),
  wpPostId: z.coerce.number().int().positive(),
  slug: articleSlugSchema,
  parentId: z
    .string()
    .uuid("Invalid parent comment")
    .nullish()
    .or(z.literal("").transform(() => null))
    .transform((value) => value ?? null),
  body: commentBodySchema,
});

export const editCommentSchema = z.object({
  commentId: z.string().uuid(),
  country: z.string().refine(isValidCountry, "Unsupported country"),
  slug: articleSlugSchema,
  body: commentBodySchema,
});

export const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
  country: z.string().refine(isValidCountry, "Unsupported country"),
  slug: articleSlugSchema,
});
