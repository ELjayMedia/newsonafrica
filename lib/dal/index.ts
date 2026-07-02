/**
 * Data access layer (NOA-86): typed, server-only functions for posts,
 * categories, countries, tags and authors, backed by the WordPress client
 * (`@/lib/wordpress`, NOA-85). Application code should import from here
 * rather than reaching into `@/lib/wordpress` directly.
 */
import "server-only";

export * from "@/lib/dal/types";
export * from "@/lib/dal/countries";
export * from "@/lib/dal/categories";
export * from "@/lib/dal/tags";
export * from "@/lib/dal/authors";
export * from "@/lib/dal/posts";
export * from "@/lib/dal/most-read";
export { mapAuthor, mapCategory, mapPost, mapPostSummary, mapTag } from "@/lib/dal/mappers";
