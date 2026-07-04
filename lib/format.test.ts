import { describe, expect, it } from "vitest";

import { formatDate, formatRelativeTime } from "@/lib/format";

describe("formatDate", () => {
  it("formats an ISO date string as a long-form date", () => {
    expect(formatDate("2026-07-02T10:00:00Z")).toBe("2 July 2026");
  });

  it("formats a Date instance", () => {
    expect(formatDate(new Date("2025-01-15T00:00:00Z"))).toBe("15 January 2025");
  });

  it("falls back to the raw string for unparseable input", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-02T12:00:00Z");

  it("reports 'just now' for very recent timestamps", () => {
    expect(formatRelativeTime(new Date("2026-07-02T11:59:40Z"), now)).toBe("just now");
  });

  it("reports minutes ago", () => {
    expect(formatRelativeTime(new Date("2026-07-02T11:45:00Z"), now)).toBe("15 minutes ago");
  });

  it("reports hours ago", () => {
    expect(formatRelativeTime(new Date("2026-07-02T09:00:00Z"), now)).toBe("3 hours ago");
  });

  it("reports days ago", () => {
    expect(formatRelativeTime(new Date("2026-06-29T12:00:00Z"), now)).toBe("3 days ago");
  });

  it("falls back to the raw string for unparseable input", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("not-a-date");
  });
});
