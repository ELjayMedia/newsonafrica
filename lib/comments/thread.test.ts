import { describe, expect, it } from "vitest";

import { buildCommentTree, countCommentNodes, type ThreadableComment } from "@/lib/comments/thread";

let sequence = 0;

function comment(
  id: string,
  parentId: string | null,
  rootId: string,
  createdAt?: string,
): ThreadableComment {
  sequence += 1;
  return {
    id,
    parent_id: parentId,
    root_id: rootId,
    created_at: createdAt ?? `2026-07-03T10:00:${String(sequence).padStart(2, "0")}.000Z`,
  };
}

describe("buildCommentTree", () => {
  it("returns roots in pagination order with empty replies", () => {
    const roots = [comment("b", null, "b"), comment("a", null, "a")];
    const tree = buildCommentTree(roots, []);

    expect(tree.map((node) => node.id)).toEqual(["b", "a"]);
    expect(tree.every((node) => node.replies.length === 0)).toBe(true);
  });

  it("nests replies under their direct parent", () => {
    const root = comment("root", null, "root");
    const reply = comment("reply", "root", "root");
    const nested = comment("nested", "reply", "root");

    const tree = buildCommentTree([root], [reply, nested]);

    expect(tree[0]!.replies.map((node) => node.id)).toEqual(["reply"]);
    expect(tree[0]!.replies[0]!.replies.map((node) => node.id)).toEqual(["nested"]);
  });

  it("sorts replies oldest-first with id tiebreak", () => {
    const root = comment("root", null, "root");
    const later = comment("later", "root", "root", "2026-07-03T12:00:00.000Z");
    const earlier = comment("earlier", "root", "root", "2026-07-03T11:00:00.000Z");
    const tieB = comment("b-tie", "root", "root", "2026-07-03T11:30:00.000Z");
    const tieA = comment("a-tie", "root", "root", "2026-07-03T11:30:00.000Z");

    const tree = buildCommentTree([root], [later, earlier, tieB, tieA]);

    expect(tree[0]!.replies.map((node) => node.id)).toEqual(["earlier", "a-tie", "b-tie", "later"]);
  });

  it("re-attaches replies whose parent is missing to the thread root", () => {
    // e.g. RLS hid a pending intermediate comment from this viewer.
    const root = comment("root", null, "root");
    const orphan = comment("orphan", "invisible-parent", "root");

    const tree = buildCommentTree([root], [orphan]);

    expect(tree[0]!.replies.map((node) => node.id)).toEqual(["orphan"]);
  });

  it("drops replies whose entire thread root is missing", () => {
    const root = comment("root", null, "root");
    const stray = comment("stray", "other-root", "other-root");

    const tree = buildCommentTree([root], [stray]);

    expect(countCommentNodes(tree)).toBe(1);
  });

  it("handles multiple threads independently", () => {
    const rootA = comment("a", null, "a");
    const rootB = comment("b", null, "b");
    const replyA = comment("a1", "a", "a");
    const replyB = comment("b1", "b", "b");
    const replyB2 = comment("b2", "b1", "b");

    const tree = buildCommentTree([rootA, rootB], [replyB, replyA, replyB2]);

    expect(tree[0]!.replies.map((node) => node.id)).toEqual(["a1"]);
    expect(tree[1]!.replies.map((node) => node.id)).toEqual(["b1"]);
    expect(tree[1]!.replies[0]!.replies.map((node) => node.id)).toEqual(["b2"]);
  });
});

describe("countCommentNodes", () => {
  it("counts roots and nested replies", () => {
    const root = comment("root", null, "root");
    const reply = comment("reply", "root", "root");
    const nested = comment("nested", "reply", "root");

    const tree = buildCommentTree([root], [reply, nested]);

    expect(countCommentNodes(tree)).toBe(3);
    expect(countCommentNodes([])).toBe(0);
  });
});
