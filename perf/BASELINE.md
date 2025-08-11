# Performance Baseline

## Top Client Chunks

| Chunk | Parsed Size (bytes) | Importers |
| --- | ---: | --- |
| static/chunks/36584dc2-b35d662a0fcb9551.js | 172829 | node_modules/.pnpm/next@14.2.16_@babel+core@7.28.0_react-dom@18.0.0_react@18.0.0__react@18.0.0/node_modules/next/dist/compiled/react-dom/cjs |
| static/chunks/framework-b93f1d624ce4984c.js | 139368 | node_modules/.pnpm |
| static/chunks/7436-2ad670ed046279c6.js | 129985 | node_modules/.pnpm |
| static/chunks/5664-263e8608f26a396b.js | 123829 | node_modules/.pnpm |
| static/chunks/main-7f25fb188388ef6c.js | 120822 | node_modules/.pnpm, utils |
| static/chunks/3274-861ae4e3bd940d91.js | 66557 | node_modules/.pnpm |
| static/chunks/7859-e8f6332275fb0712.js | 49217 | node_modules/.pnpm |
| static/chunks/app/post/[slug]/page-40476409b8efd905.js | 46903 | components |
| static/chunks/1624-60499b8ac36528da.js | 39108 | node_modules/.pnpm |
| static/chunks/app/profile/page-07e29a4231d1efff.js | 36504 | components, lib, hooks |

## Lighthouse Budget

\`\`\`json
{
  "path": "/*",
  "timings": [
    { "metric": "largest-contentful-paint", "budget": 2500 },
    { "metric": "cumulative-layout-shift", "budget": 0.1 },
    { "metric": "total-blocking-time", "budget": 300 }
  ]
}
\`\`\`
