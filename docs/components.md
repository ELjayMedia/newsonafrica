# Component Documentation

The project follows a feature-first layout for React components. Use this guide to locate and extend shared UI elements without duplicating logic.

## Directory structure

```
components/
├── features/       # Feature-scoped components (e.g. hero, live updates)
├── layout/         # Layout primitives shared across pages
└── ui/             # Reusable UI atoms and molecules
```

### `components/ui`

Generic UI primitives live in this directory. They are safe to reuse across any feature and should avoid domain-specific dependencies.

Typical examples include:

- Buttons and icon buttons
- Form inputs, selects, and text areas
- Skeleton loaders
- Typography helpers

When authoring new primitives:

1. Co-locate stories or usage examples in `components/ui/__docs__` when the component benefits from dedicated guidance.
2. Export the component from `components/ui/index.ts` to ensure it is discoverable across the codebase.
3. Keep styling consistent by using Tailwind utility classes defined in `tailwind.config.ts`.

### `components/layout`

Layout components enforce structural patterns shared across pages, such as grid shells and navigation frames.

- Maintain responsive breakpoints aligned with the design system.
- Avoid importing feature code; layout should remain unopinionated about data sources.
- Memoize expensive wrappers like sticky headers if they depend on scroll listeners.

### `components/features`

Feature directories encapsulate domain logic alongside their UI. For example, a `home` folder might expose cards, hero modules, and carousels that fetch data from WordPress.

- Keep feature folders self-contained—fetching hooks, helper utilities, and types can live alongside the components.
- Re-export feature components through an `index.ts` file so routes can consume them without deep relative imports.
- Document feature-specific props in a `README.md` placed inside the feature folder when the API becomes complex.

## Creating new components

1. Choose the appropriate directory (`ui`, `layout`, or a feature folder).
2. Scaffold the component with a `.tsx` file and a matching `.test.tsx` if behavior warrants automated coverage.
3. Re-export the component from the nearest `index.ts` to simplify imports.
4. Add Storybook stories or MDX documentation when the component is reusable across squads.

## Styling guidelines

- Prefer Tailwind utility classes. When custom CSS is necessary, add it to `styles/global.css` and scope selectors with a component-specific prefix.
- Use semantic HTML elements (e.g. `button`, `nav`, `section`) to support accessibility tooling.
- Leverage the shared theme tokens defined in `tailwind.config.ts` for spacing, colors, and typography.

## Testing

Vitest and Testing Library power component tests. To add coverage:

1. Create a `<component>.test.tsx` file adjacent to the component.
2. Import helper utilities from `vitest.setup.ts` for consistent render and Supabase mocking.
3. Run `pnpm test` to execute the suite locally.

Following these conventions keeps the component library consistent and discoverable as the product grows.
