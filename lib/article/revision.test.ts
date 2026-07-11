import { describe, expect, it } from "vitest";

import { MIN_MEANINGFUL_UPDATE_MS, shouldShowUpdatedTimestamp } from "@/lib/article/revision";

const base = "2026-07-01T09:00:00.000Z";

describe("shouldShowUpdatedTimestamp", () => {
  it("shows when the modified time is at least the threshold after publish", () => {
    const updated = new Date(Date.parse(base) + MIN_MEANINGFUL_UPDATE_MS).toISOString();
    expect(shouldShowUpdatedTimestamp(base, updated)).toBe(true);

    const nextDay = "2026-07-02T09:00:00.000Z";
    expect(shouldShowUpdatedTimestamp(base, nextDay)).toBe(true);
  });

  it("hides trivial re-saves below the threshold (WordPress bumps `modified` on any edit)", () => {
    const tenMinutes = new Date(Date.parse(base) + 10 * 60 * 1000).toISOString();
    expect(shouldShowUpdatedTimestamp(base, tenMinutes)).toBe(false);
  });

  it("hides when modified equals published", () => {
    expect(shouldShowUpdatedTimestamp(base, base)).toBe(false);
  });

  it("never shows for an earlier or equal modified time", () => {
    const earlier = "2026-06-30T09:00:00.000Z";
    expect(shouldShowUpdatedTimestamp(base, earlier)).toBe(false);
  });

  it("returns false for missing or unparseable input", () => {
    expect(shouldShowUpdatedTimestamp("", base)).toBe(false);
    expect(shouldShowUpdatedTimestamp(base, "")).toBe(false);
    expect(shouldShowUpdatedTimestamp("not-a-date", base)).toBe(false);
    expect(shouldShowUpdatedTimestamp(base, "not-a-date")).toBe(false);
  });

  it("respects a custom minimum gap", () => {
    const fiveMinutes = new Date(Date.parse(base) + 5 * 60 * 1000).toISOString();
    expect(shouldShowUpdatedTimestamp(base, fiveMinutes, 60 * 1000)).toBe(true);
  });
});
