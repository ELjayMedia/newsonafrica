/**
 * Public entry point for the WordPress client (NOA-85).
 *
 * The data access layer (`@/lib/dal`, NOA-86) is the intended consumer of
 * this module — application code should generally prefer the DAL's
 * normalized domain types over these raw WordPress shapes.
 */
import "server-only";

export * from "@/lib/wordpress/http";
export * from "@/lib/wordpress/countries";
export * from "@/lib/wordpress/cache-tags";
export * from "@/lib/wordpress/types";
export * from "@/lib/wordpress/rest-client";
export * from "@/lib/wordpress/graphql-client";
export * from "@/lib/wordpress/queries";
