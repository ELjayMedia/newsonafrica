import { describe, expect, it } from "vitest";

import {
  buildCursorConditions,
  decodeCommentCursor,
  encodeCommentCursor,
  type CommentCursor,
} from "@/lib/comments/cursor";

const CURSOR: CommentCursor = {
  sort: "newest",
  createdAt: "2026-07-03T10:00:00.000Z",
  id: "3f2f9a52-7e01-4c39-9d9d-2b7a29a1a111",
};

describe("encodeCommentCursor / decodeCommentCursor", () => {
  it("round-trips a newest cursor", () => {
    expect(decodeCommentCursor(encodeCommentCursor(CURSOR))).toEqual(CURSOR);
  });

  it("round-trips an oldest cursor", () => {
    const cursor: CommentCursor = { ...CURSOR, sort: "oldest" };
    expect(decodeCommentCursor(encodeCommentCursor(cursor))).toEqual(cursor);
  });

  it("URI-encodes separator-sensitive characters", () => {
    const encoded = encodeCommentCursor(CURSOR);
    expect(encoded.split("|")).toHaveLength(3);
    expect(encoded).not.toContain(":"); // ISO colons are escaped
  });

  it("returns null for null/undefined/empty input", () => {
    expect(decodeCommentCursor(null)).toBeNull();
    expect(decodeCommentCursor(undefined)).toBeNull();
    expect(decodeCommentCursor("")).toBeNull();
  });

  it("returns null for a malformed part count", () => {
    expect(decodeCommentCursor("newest|2026-07-03T10%3A00%3A00.000Z")).toBeNull();
    expect(decodeCommentCursor("a|b|c|d")).toBeNull();
  });

  it("returns null for an unknown sort", () => {
    const tampered = encodeCommentCursor(CURSOR).replace("newest", "popular");
    expect(decodeCommentCursor(tampered)).toBeNull();
  });

  it("returns null for an unparseable timestamp", () => {
    expect(decodeCommentCursor(`newest|not-a-date|${CURSOR.id}`)).toBeNull();
  });

  it("returns null when the id is not a UUID (blocks filter injection)", () => {
    expect(
      decodeCommentCursor("newest|2026-07-03T10%3A00%3A00.000Z|1,status.eq.hidden"),
    ).toBeNull();
    expect(
      decodeCommentCursor("newest|2026-07-03T10%3A00%3A00.000Z|1%2Cstatus.eq.hidden"),
    ).toBeNull();
  });
});

describe("buildCursorConditions", () => {
  it("returns [] without a cursor", () => {
    expect(buildCursorConditions("newest", null)).toEqual([]);
  });

  it("ignores a cursor built for a different sort", () => {
    expect(buildCursorConditions("oldest", CURSOR)).toEqual([]);
  });

  it("builds strictly-older disjuncts for newest", () => {
    expect(buildCursorConditions("newest", CURSOR)).toEqual([
      `created_at.lt.${CURSOR.createdAt}`,
      `and(created_at.eq.${CURSOR.createdAt},id.lt.${CURSOR.id})`,
    ]);
  });

  it("builds strictly-newer disjuncts for oldest", () => {
    const cursor: CommentCursor = { ...CURSOR, sort: "oldest" };
    expect(buildCursorConditions("oldest", cursor)).toEqual([
      `created_at.gt.${cursor.createdAt}`,
      `and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
    ]);
  });
});
