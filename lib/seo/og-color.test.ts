import { describe, expect, it } from "vitest";

import { hslChannelsToHex } from "@/lib/seo/og-color";

describe("hslChannelsToHex", () => {
  it("converts the design-token channel triples to their known hex values", () => {
    // colorTokens.dark.primary — brand green (Tailwind green-500).
    expect(hslChannelsToHex("142.1 70.6% 45.3%")).toBe("#22c55e");
    // colorTokens.dark.background (zinc-950).
    expect(hslChannelsToHex("240 10% 3.9%")).toBe("#09090b");
    // colorTokens.dark.foreground.
    expect(hslChannelsToHex("0 0% 98%")).toBe("#fafafa");
    // colorTokens.dark.mutedForeground (zinc-400).
    expect(hslChannelsToHex("240 5% 65%")).toBe("#a1a1aa");
  });

  it("handles the extremes", () => {
    expect(hslChannelsToHex("0 0% 0%")).toBe("#000000");
    expect(hslChannelsToHex("0 0% 100%")).toBe("#ffffff");
    expect(hslChannelsToHex("0 100% 50%")).toBe("#ff0000");
    expect(hslChannelsToHex("240 100% 50%")).toBe("#0000ff");
  });

  it("throws on malformed input", () => {
    expect(() => hslChannelsToHex("not a color")).toThrow(/Invalid HSL channel triple/);
    expect(() => hslChannelsToHex("142.1, 70.6%, 45.3%")).toThrow(/Invalid HSL channel triple/);
  });
});
