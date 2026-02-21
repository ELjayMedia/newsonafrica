# WordPress service migration

Use `@/lib/wordpress/service` as the canonical import root for WordPress read operations.

## Import replacements

| Old import path | New import path |
| --- | --- |
| `@/lib/wordpress-api` | `@/lib/wordpress/service` |
| `@/lib/wp-server/categories` | `@/lib/wordpress/service` |
| `@/lib/wp-server/tags` | `@/lib/wordpress/service` |
| `@/lib/wp-server/authors` | `@/lib/wordpress/service` |

## Notes

- `lib/wordpress-api.ts` and `lib/wp-server/*` are now compatibility shims and should not be used for new code.
- Transport-layer helpers (direct GraphQL/REST clients) are intentionally kept out of the canonical service API.
