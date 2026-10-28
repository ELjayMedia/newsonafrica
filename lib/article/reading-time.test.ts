import { describe, expect, it } from "vitest";

import { countWords, estimateReadingMinutes } from "@/lib/article/reading-time";

describe("countWords", () => {
  it("ignores markup and non-breaking spaces", () => {
    expect(countWords("<p>One&nbsp;two</p><p><strong>three</strong> four</p>")).toBe(4);
  });

  it("returns 0 for empty content", () => {
    expect(countWords("   ")).toBe(0);
  });
});

describe("estimateReadingMinutes", () => {
  it("rounds up to whole minutes at 200 words per minute", () => {
    expect(estimateReadingMinutes(`<p>${"word ".repeat(201)}</p>`)).toBe(2);
  });

  it("never reports less than one minute", () => {
    expect(estimateReadingMinutes("<p>Short.</p>")).toBe(1);
  });
});
