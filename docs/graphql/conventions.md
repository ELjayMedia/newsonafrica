# GraphQL operation naming conventions

This project stores GraphQL operation documents in `src/lib/graphql/operations/`, grouped by business domain.

## Folder layout

- `src/lib/graphql/operations/posts/` for post-centric operations.
- `src/lib/graphql/operations/taxonomy/` for category/tag/taxonomy operations.
- `src/lib/graphql/operations/authors/` for author/profile operations.
- `src/lib/graphql/operations/search/` for search-focused operations.

Each operation lives in its own `.graphql` file, and each domain contains an `index.graphql` barrel file that imports every operation in that domain.

## Naming rules

To prevent duplicate and ambiguous operation names:

1. **Use `<Domain>_<Purpose>` as the operation name.**
   - Examples: `Posts_HomeFeed`, `Posts_BySlug`, `Taxonomy_CategoryFeed`, `Authors_ProfileFeed`, `Search_Posts`.
2. **Match filename to operation name exactly.**
   - Example: `query Posts_BySlug` must be stored in `Posts_BySlug.graphql`.
3. **Use stable domain prefixes only.**
   - Allowed prefixes: `Posts`, `Taxonomy`, `Authors`, `Search`.
4. **Use purpose names that describe one use-case.**
   - Prefer `BySlug`, `HomeFeed`, `CategoryFeed`, `RelatedByTags` over generic names like `GetData`.
5. **Never reuse an existing operation name for a different variable contract or response shape.**
   - If shape/intent changes, create a new purpose name.
6. **Do not create aliases that differ only by casing/pluralization.**
   - Invalid pairs: `Post_BySlug` vs `Posts_BySlug`, `posts_homEfeed` vs `Posts_HomeFeed`.

## Authoring checklist

Before adding a new operation:

- Pick the correct domain folder.
- Confirm operation name does not already exist in any domain barrel.
- Keep one operation per `.graphql` file.
- Add the new file to that domain's `index.graphql` barrel.
- Use the same name in filename and `query`/`mutation` declaration.
