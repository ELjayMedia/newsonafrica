# Design System Notes

## Color Tokens

### Warning
- `--warning`: `hsl(32 95% 44%)`
- `--warning-foreground`: `hsl(48 100% 96%)`
- `--warning-light`: `hsl(48 96% 89%)`
- `--warning-dark`: `hsl(22 78% 26%)`

Use `bg-warning-dark text-warning-foreground` for banner-style alerts. The pairing yields an 8.86:1 contrast ratio in light mode and remains above 4.5:1 in dark mode.

### Neutral Text Updates
- Prefer `text-gray-600`/`dark:text-gray-300` for empty-state body copy on light/dark surfaces. The combination keeps contrast ≥4.8:1 on light backgrounds and ≥7:1 on dark backgrounds.
- For secondary metadata or counters, `text-gray-500` on light surfaces (contrast ≈4.8:1) and `dark:text-gray-400` on dark surfaces keep guidance aligned with WCAG AA.

## Contrast Testing

Contrast ratios were verified with a Node-based utility (`scripts/contrast-check.mjs`) covering light and dark themes. The following pairings were validated:

| Token Pairing | Light Mode Ratio | Dark Mode Ratio |
| --- | --- | --- |
| `bg-warning-dark` & `text-warning-foreground` | 8.86:1 | 8.86:1 |
| `text-gray-600` on light surfaces | 7.56:1 | – |
| `dark:text-gray-300` on dark surfaces | – | 13.44:1 |

To reproduce, run:

\`\`\`bash
node scripts/contrast-check.mjs
\`\`\`
