/**
 * Threading logic for comments (NOA-101): turns the two flat result sets
 * the DAL fetches (a cursor-page of top-level comments + every reply in
 * those threads via root_id) into a nested tree for rendering.
 *
 * Pure and dependency-free so it unit-tests without Supabase.
 */

/** The minimal shape threading needs — `CommentRow` satisfies it. */
export interface ThreadableComment {
  id: string;
  parent_id: string | null;
  root_id: string | null;
  created_at: string;
}

export type CommentNode<T extends ThreadableComment> = T & {
  replies: CommentNode<T>[];
};

/** Oldest-first within a thread, id as a stable tiebreaker. */
function byCreatedAtAsc(a: ThreadableComment, b: ThreadableComment): number {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Builds the reply tree for a page of top-level comments.
 *
 * - `roots` keep the order they were paginated in (cursor order).
 * - Replies nest under their direct parent, oldest first.
 * - A reply whose parent isn't in the result set (e.g. RLS hid a pending
 *   parent from this viewer) is re-attached to its thread root so it is
 *   never silently dropped; replies whose entire thread root is missing
 *   are discarded.
 */
export function buildCommentTree<T extends ThreadableComment>(
  roots: T[],
  replies: T[],
): CommentNode<T>[] {
  const nodes = new Map<string, CommentNode<T>>();

  for (const root of roots) {
    nodes.set(root.id, { ...root, replies: [] });
  }
  for (const reply of replies) {
    // A row can't be both a paginated root and a reply; roots win.
    if (!nodes.has(reply.id)) {
      nodes.set(reply.id, { ...reply, replies: [] });
    }
  }

  const sortedReplies = replies
    .filter((reply) => reply.parent_id !== null)
    .sort(byCreatedAtAsc);

  for (const reply of sortedReplies) {
    const node = nodes.get(reply.id);
    if (!node) continue;

    const parent = reply.parent_id ? nodes.get(reply.parent_id) : undefined;
    if (parent) {
      parent.replies.push(node);
      continue;
    }

    const root = reply.root_id ? nodes.get(reply.root_id) : undefined;
    if (root && root.id !== reply.id) {
      root.replies.push(node);
    }
  }

  return roots.map((root) => nodes.get(root.id)!);
}

/** Total number of comments in a tree (roots + nested replies). */
export function countCommentNodes<T extends ThreadableComment>(nodes: CommentNode<T>[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1 + countCommentNodes(node.replies);
  }
  return total;
}
