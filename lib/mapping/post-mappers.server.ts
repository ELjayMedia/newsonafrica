import "server-only"

import { normalizePostContent } from "@/lib/wordpress/normalize"
import {
  mapGraphqlPostToWordPressPost as mapGraphqlPostToWordPressPostShared,
  type GraphqlPostNode,
} from "@/lib/mapping/post-mappers.shared"

export const mapGraphqlPostToWordPressPost = (
  post: GraphqlPostNode,
  countryCode?: string,
) =>
  mapGraphqlPostToWordPressPostShared(post, countryCode, {
    normalizeContent: normalizePostContent,
  })
