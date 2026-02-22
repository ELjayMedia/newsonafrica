import "server-only"

import { normalizeWordPressPostContent } from "@/lib/wordpress/normalize-post-content"
import {
  mapGraphqlPostToWordPressPost as mapGraphqlPostToWordPressPostShared,
  type GraphqlPostNode,
} from "@/lib/mapping/post-mappers.shared"

export const mapGraphqlPostToWordPressPost = (
  post: GraphqlPostNode,
  countryCode?: string,
) =>
  mapGraphqlPostToWordPressPostShared(post, countryCode, {
    normalizeContent: normalizeWordPressPostContent,
  })
