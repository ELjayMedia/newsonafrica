#!/usr/bin/env node
/**
 * Quick contrast sweep for updated theme tokens.
 * Calculates WCAG contrast ratios for critical pairings across light/dark.
 */

const tokens = {
  light: {
    warningDark: { h: 22, s: 78, l: 26 },
    warningForeground: { h: 48, s: 100, l: 96 },
    neutralStrong: { hex: "#4b5563" },
    background: { hex: "#ffffff" },
  },
  dark: {
    warningDark: { h: 22, s: 78, l: 26 },
    warningForeground: { h: 48, s: 100, l: 96 },
    neutralStrong: { hex: "#d1d5db" },
    background: { hex: "#0a0a0a" },
  },
}

function hslToRgb({ h, s, l }) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "")
  const bigint = parseInt(normalized, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function luminance([r, g, b]) {
  const channel = [r, g, b].map((value) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2]
}

function contrast(rgbA, rgbB) {
  const lumA = luminance(rgbA)
  const lumB = luminance(rgbB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

function resolveColor(definition) {
  if (definition.hex) return hexToRgb(definition.hex)
  return hslToRgb(definition)
}

function formatRatio(value) {
  return `${value.toFixed(2)}:1`
}

const results = []

for (const mode of Object.keys(tokens)) {
  const palette = tokens[mode]
  const combos = [
    {
      name: "warning banner",
      foreground: palette.warningForeground,
      background: palette.warningDark,
    },
    {
      name: "neutral body copy",
      foreground: palette.neutralStrong,
      background: palette.background,
    },
  ]

  for (const combo of combos) {
    const ratio = contrast(resolveColor(combo.foreground), resolveColor(combo.background))
    results.push({ mode, combo: combo.name, ratio })
  }
}

console.table(
  results.map((entry) => ({
    mode: entry.mode,
    pairing: entry.combo,
    ratio: formatRatio(entry.ratio),
    passAA: entry.ratio >= 4.5,
  })),
)

const failures = results.filter((entry) => entry.ratio < 4.5)
if (failures.length) {
  console.error("\nContrast check failed for:")
  failures.forEach((failure) => {
    console.error(`${failure.mode} – ${failure.combo}: ${failure.ratio.toFixed(2)}:1`)
  })
  process.exit(1)
}

console.log("\nAll checked contrasts meet or exceed WCAG AA (4.5:1).")
