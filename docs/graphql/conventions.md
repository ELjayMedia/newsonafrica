# GraphQL Operation Conventions

## Directory structure

Store operation documents under `src/lib/graphql/operations` and group them by domain:

- `posts/`
- `taxonomy/`
- `authors/`
- `search/`

Each operation must live in its own `.graphql` file.

## Naming rules

To prevent duplicate or ambiguous operation names:

1. Prefix every operation with the domain in PascalCase.
2. Add an underscore separator.
3. Use a purpose-specific suffix in PascalCase.

Pattern:

```text
<Domain>_<Purpose>
```

Examples:

- `Posts_HomeFeed`
- `Posts_BySlug`
- `Taxonomy_CategoryFeed`
- `Authors_Directory`
- `Search_Posts`

## File naming rules

- File name must exactly match the operation name, plus `.graphql`.
- Keep one operation per file.

Examples:

- `Posts_HomeFeed.graphql`
- `Taxonomy_CategoryFeed.graphql`

## Barrel exports

- Create an `index.ts` in each domain directory that re-exports domain operations.
- Keep a root `src/lib/graphql/operations/index.ts` that re-exports all domain barrels.

This gives a stable import surface and avoids ad-hoc paths.
