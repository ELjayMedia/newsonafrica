import { z } from "zod"

const imageNodeSchema = z
  .object({
    sourceUrl: z.string().nullish(),
    altText: z.string().nullish(),
    caption: z.string().nullish(),
    mediaDetails: z
      .object({
        width: z.number().int().nullish(),
        height: z.number().int().nullish(),
      })
      .nullish(),
  })
  .passthrough()

const postSummarySchema = z
  .object({
    databaseId: z.number().int().nullish(),
    id: z.string().nullish(),
    slug: z.string().nullish(),
    date: z.string().nullish(),
    modified: z.string().nullish(),
    title: z.string().nullish(),
    excerpt: z.string().nullish(),
    uri: z.string().nullish(),
    link: z.string().nullish(),
    featuredImage: z
      .object({
        node: imageNodeSchema.nullish(),
      })
      .passthrough()
      .nullish(),
    categories: z
      .object({
        nodes: z
          .array(
            z
              .object({
                databaseId: z.number().int().nullish(),
                name: z.string().nullish(),
                slug: z.string().nullish(),
              })
              .passthrough()
              .nullable(),
          )
          .nullish(),
      })
      .passthrough()
      .nullish(),
    tags: z
      .object({
        nodes: z
          .array(
            z
              .object({
                databaseId: z.number().int().nullish(),
                name: z.string().nullish(),
                slug: z.string().nullish(),
              })
              .passthrough()
              .nullable(),
          )
          .nullish(),
      })
      .passthrough()
      .nullish(),
    author: z
      .object({
        node: z
          .object({
            databaseId: z.number().int().nullish(),
            name: z.string().nullish(),
            slug: z.string().nullish(),
            description: z.string().nullish(),
            avatar: z.object({ url: z.string().nullish() }).passthrough().nullish(),
          })
          .passthrough()
          .nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough()

const postFieldsSchema = postSummarySchema.extend({
  content: z.string().nullish(),
})

const pageInfoSchema = z
  .object({
    endCursor: z.string().nullish(),
    hasNextPage: z.boolean().nullish(),
    offsetPagination: z.object({ total: z.number().int().nullish() }).passthrough().nullish(),
  })
  .passthrough()

const nullablePostSummaryList = z.array(postSummarySchema.nullable()).nullish()

export type OperationValidationSchema = {
  variables: z.ZodTypeAny
  response: z.ZodTypeAny
}

export const productionOperationSchemas: Record<string, OperationValidationSchema> = {
  FrontPageSlices: {
    variables: z.object({
      heroFirst: z.number().int(),
      first: z.number().int(),
      heroTagSlugs: z.array(z.string()).optional(),
      after: z.string().optional(),
    }),
    response: z.object({
      hero: z.object({ nodes: nullablePostSummaryList }).passthrough().nullish(),
      latest: z
        .object({
          pageInfo: pageInfoSchema.nullish(),
          edges: z
            .array(
              z
                .object({
                  cursor: z.string().nullish(),
                  node: postSummarySchema.nullish(),
                })
                .passthrough()
                .nullable(),
            )
            .nullish(),
        })
        .passthrough()
        .nullish(),
    }),
  },
  PostBySlug: {
    variables: z.object({
      slug: z.union([z.string(), z.number()]),
      asPreview: z.boolean().optional(),
    }),
    response: z.object({
      post: postFieldsSchema.nullish(),
      posts: z
        .object({
          nodes: z.array(postFieldsSchema.nullable()).nullish(),
        })
        .passthrough()
        .nullish(),
    }),
  },
  PostsByCategory: {
    variables: z.object({ category: z.string(), first: z.number().int(), after: z.string().optional() }),
    response: z.object({
      categories: z
        .object({
          nodes: z.array(z.object({ slug: z.string().nullish() }).passthrough().nullable()).nullish(),
        })
        .passthrough()
        .nullish(),
      posts: z.object({ pageInfo: pageInfoSchema.nullish(), nodes: nullablePostSummaryList }).passthrough().nullish(),
    }),
  },
  CategoryPosts: {
    variables: z.object({ slug: z.string(), first: z.number().int(), after: z.string().optional() }),
    response: z.object({
      categories: z
        .object({
          nodes: z.array(z.object({ slug: z.string().nullish() }).passthrough().nullable()).nullish(),
        })
        .passthrough()
        .nullish(),
      posts: z.object({ pageInfo: pageInfoSchema.nullish(), nodes: nullablePostSummaryList }).passthrough().nullish(),
    }),
  },
  TaggedPosts: {
    variables: z.object({ tagSlugs: z.array(z.string()), first: z.number().int(), after: z.string().optional() }),
    response: z.object({
      posts: z.object({ pageInfo: pageInfoSchema.nullish(), nodes: nullablePostSummaryList }).passthrough().nullish(),
    }),
  },
  TagBySlug: {
    variables: z.object({ slug: z.union([z.string(), z.number()]) }),
    response: z.object({
      tag: z
        .object({
          databaseId: z.number().int().nullish(),
          id: z.string().nullish(),
          name: z.string().nullish(),
          slug: z.string().nullish(),
          count: z.number().int().nullish(),
        })
        .passthrough()
        .nullish(),
    }),
  },
  Posts: {
    variables: z.object({
      first: z.number().int(),
      after: z.string().optional(),
      category: z.string().optional(),
      tagSlugs: z.array(z.string()).optional(),
      search: z.string().optional(),
      authorIds: z.array(z.union([z.string(), z.number()])).optional(),
      includeIds: z.array(z.union([z.string(), z.number()])).optional(),
      onlySticky: z.boolean().optional(),
      offset: z.number().int().optional(),
      orderField: z.string().optional(),
      orderDirection: z.string().optional(),
    }),
    response: z.object({
      posts: z.object({ pageInfo: pageInfoSchema.nullish(), nodes: nullablePostSummaryList }).passthrough().nullish(),
    }),
  },
  RelatedPostsWithCategories: {
    variables: z.object({ id: z.union([z.string(), z.number()]), exclude: z.union([z.string(), z.number()]), first: z.number().int() }),
    response: z.object({
      post: z
        .object({
          categories: z
            .object({
              nodes: z
                .array(
                  z
                    .object({
                      databaseId: z.number().int().nullish(),
                      posts: z.object({ nodes: nullablePostSummaryList }).passthrough().nullish(),
                    })
                    .passthrough()
                    .nullable(),
                )
                .nullish(),
            })
            .passthrough()
            .nullish(),
        })
        .passthrough()
        .nullish(),
    }),
  },
  RelatedPosts: {
    variables: z.object({
      catIds: z.array(z.union([z.string(), z.number()])).optional(),
      exclude: z.union([z.string(), z.number()]),
      first: z.number().int(),
    }),
    response: z.object({ posts: z.object({ nodes: nullablePostSummaryList }).passthrough().nullish() }),
  },
  RelatedPostsByTags: {
    variables: z.object({
      tagSlugs: z.array(z.string()),
      exclude: z.union([z.string(), z.number()]),
      first: z.number().int(),
    }),
    response: z.object({ posts: z.object({ nodes: nullablePostSummaryList }).passthrough().nullish() }),
  },
  AuthorData: {
    variables: z.object({ slug: z.string(), first: z.number().int(), after: z.string().optional() }),
    response: z.object({
      user: z
        .object({
          slug: z.string().nullish(),
          posts: z
            .object({
              pageInfo: pageInfoSchema.nullish(),
              nodes: nullablePostSummaryList,
            })
            .passthrough()
            .nullish(),
        })
        .passthrough()
        .nullish(),
    }),
  },
  FeaturedPosts: {
    variables: z.object({ tag: z.string(), first: z.number().int() }),
    response: z.object({ posts: z.object({ nodes: nullablePostSummaryList }).passthrough().nullish() }),
  },
}
