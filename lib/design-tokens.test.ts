import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  brandTokens,
  colorTokens,
  desktopBreakpointPx,
  desktopRootScale,
  layoutTokens,
  radiusScale,
  smallTextFloorPx,
  typographyScale,
} from "./design-tokens";

/**
 * Guards against drift between the runtime tokens in app/globals.css and
 * their typed mirror in lib/design-tokens.ts. If this fails, update whichever
 * side is stale so the two say the same thing.
 */

const css = readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Body of the first `{ … }` block whose opening matches `opener`, brace-balanced. */
function block(opener: RegExp): string {
  const match = opener.exec(css);
  if (!match) throw new Error(`No block matching ${opener} in globals.css`);
  let depth = 1;
  const start = match.index + match[0].length;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i);
  }
  throw new Error(`Unbalanced block for ${opener}`);
}

/** Top-level declarations of a block (nested blocks removed). */
function declarations(body: string): Map<string, string> {
  const flat = body.replace(/\{[^{}]*\}/g, "");
  const out = new Map<string, string>();
  for (const match of flat.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(match[1]!, match[2]!.trim().replace(/\s+/g, " "));
  }
  return out;
}

const kebab = (key: string) => key.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();
const HSL_TRIPLE = /^[\d.]+ [\d.]+% [\d.]+%$/;

const root = declarations(block(/^:root \{/m));
const dark = declarations(block(/^\.dark \{/m));
const theme = declarations(block(/^@theme inline \{/m));
const rootLg = declarations(block(/@media \(min-width: 1024px\) \{\s*:root \{/));

/** Semantic HSL variables of a theme block, keyed by variable name. */
function hslVars(decls: Map<string, string>): Map<string, string> {
  return new Map(
    [...decls]
      .filter(([name, value]) => name.startsWith("--") && HSL_TRIPLE.test(value))
      .map(([name, value]) => [name.slice(2), value]),
  );
}

describe("design tokens mirror app/globals.css", () => {
  it.each([
    ["light", colorTokens.light, hslVars(root)],
    ["dark", colorTokens.dark, hslVars(dark)],
  ] as const)("semantic colours (%s) match exactly, with none missing", (_, tokens, vars) => {
    const fromModule = Object.fromEntries(
      Object.entries(tokens).map(([key, value]) => [kebab(key), value]),
    );
    expect(fromModule).toEqual(Object.fromEntries(vars));
  });

  it("brand palette (light) matches the --noa-* colours on :root", () => {
    for (const [key, value] of Object.entries(brandTokens.light)) {
      expect(root.get(`--noa-${kebab(key)}`), key).toBe(value);
    }
    const cssBrand = [...root.keys()].filter(
      (n) => n.startsWith("--noa-") && root.get(n)!.startsWith("#"),
    );
    expect(cssBrand.sort()).toEqual(
      Object.keys(brandTokens.light)
        .map((k) => `--noa-${kebab(k)}`)
        .sort(),
    );
  });

  it("brand palette (dark) is :root overridden by .dark", () => {
    for (const [key, value] of Object.entries(brandTokens.dark)) {
      const name = `--noa-${kebab(key)}`;
      expect(dark.get(name) ?? root.get(name), key).toBe(value);
    }
  });

  it("layout widths match --noa-well-w at base and lg", () => {
    expect(root.get("--noa-well-w")).toBe(layoutTokens.wellWidth.base);
    expect(rootLg.get("--noa-well-w")).toBe(layoutTokens.wellWidth.lg);
    expect(css).toContain(`@media (min-width: ${desktopBreakpointPx}px)`);
  });

  it("desktop root scale and small-text floor match the CSS", () => {
    const htmlLg = declarations(block(/@media \(min-width: 1024px\) \{\s*html \{/));
    expect(parseFloat(htmlLg.get("font-size")!)).toBeCloseTo(desktopRootScale * 100, 3);
    expect(theme.get("--text-xs")).toBe(`max(${smallTextFloorPx}px, 0.75rem)`);
  });

  it("radius base and media radius match", () => {
    expect(root.get("--radius")).toBe(radiusScale.lg);
    expect(theme.get("--radius-media")).toBe(radiusScale.media);
  });

  it.each(Object.entries(typographyScale))(
    "type style .%s matches its helper class",
    (name, style) => {
      const decls = declarations(block(new RegExp(`^\\s*\\.${name} \\{`, "m")));
      const expected = style as { size?: string; weight?: number; family?: string };
      expect(decls.get("font-size")).toBe(expected.size);
      expect(decls.get("font-weight")).toBe(expected.weight?.toString());
      expect(decls.get("font-family")).toBe(
        expected.family ? `var(--font-${expected.family})` : undefined,
      );
    },
  );
});
