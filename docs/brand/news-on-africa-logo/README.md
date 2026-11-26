# News On Africa logo kit

The approved logo ("Option A — Broken Line"): an outline of Africa, broken at
the West African coast with a dot in the gap, beside the stacked lowercase
wordmark **news on / Africa** in Archivo Bold. "Africa" is set 1.305× larger
so both lines are the same width.

All text is converted to outlines, so the SVGs need no fonts installed.

## Colours

| Token     | Hex       | Use                                     |
| --------- | --------- | --------------------------------------- |
| Green 600 | `#15994A` | Glyph and "Africa" on light backgrounds |
| Green 500 | `#1BB257` | Glyph and "Africa" on dark backgrounds  |
| Ink       | `#161412` | "news on" on light; edition bar         |
| White     | `#FFFFFF` | "news on" on dark; app icon glyph       |

## Files

| File                                      | Use                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `logo-primary`                            | Default, on white or light backgrounds                                            |
| `logo-reversed`                           | On dark backgrounds (transparent)                                                 |
| `logo-reversed-on-ink`                    | Same, with the ink background included                                            |
| `logo-mono-black`, `logo-mono-white`      | One-colour print, embossing, on photos                                            |
| `wordmark-primary`, `wordmark-reversed`   | Wordmark without the glyph                                                        |
| `edition-<name>` / `-reversed`            | Global, Eswatini, South Africa and Nigeria editions with the edition bar          |
| `glyph-green`, `glyph-white`, `glyph-ink` | The Africa glyph on its own                                                       |
| `app-icon`                                | Rounded green tile (1024 and 512 px PNG)                                          |
| `social-avatar`                           | Square green 1080 px for Facebook, X, Instagram, WhatsApp (safe for circle crops) |
| `favicon.ico`                             | 16/32/48 px browser icon                                                          |

`svg/` holds the scalable masters; `png/` has transparent exports (lockups
2000 px wide). Keep clear space around the logo of at least the height of the
"n" in "news on", and don't set the lockup smaller than 120 px wide on screen;
below that, use the glyph or app icon on its own.

Regenerate with `scripts/brand/build-brand-kit.py` (see its header).
