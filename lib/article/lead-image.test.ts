import { describe, expect, it } from "vitest";

import { leadImageAspectRatio } from "@/lib/article/lead-image";

describe("leadImageAspectRatio", () => {
  it("keeps a square image square", () => {
    expect(leadImageAspectRatio(1081, 1081)).toBe("1");
  });

  it("keeps a 3:2 photo at its own ratio", () => {
    expect(leadImageAspectRatio(1500, 1000)).toBe("1.5");
  });

  it("caps panoramas at 16:9 and portraits at 1:1", () => {
    expect(leadImageAspectRatio(3000, 1000)).toBe(String(Number((16 / 9).toFixed(4))));
    expect(leadImageAspectRatio(800, 1200)).toBe("1");
  });

  it("falls back to 16:10 when dimensions are unknown", () => {
    expect(leadImageAspectRatio(undefined, 600)).toBe("16 / 10");
    expect(leadImageAspectRatio(0, 0)).toBe("16 / 10");
  });
});
