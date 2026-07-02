import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const revalidateTagMock = vi.fn();
const syncPostByIdMock = vi.fn().mockResolvedValue({ success: true });
const deletePostFromIndexMock = vi.fn().mockResolvedValue({ success: true });

vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => revalidateTagMock(tag),
}));

vi.mock("@/lib/content-sync/sync", () => ({
  syncPostById: (...args: unknown[]) => syncPostByIdMock(...args),
  deletePostFromIndex: (...args: unknown[]) => deletePostFromIndexMock(...args),
}));

const WEBHOOK_SECRET = "test-webhook-secret-0123456789";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/webhooks/wordpress", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-webhook-secret": WEBHOOK_SECRET, ...headers },
  });
}

describe("/api/webhooks/wordpress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without a valid secret", async () => {
    const { POST } = await import("./route");
    const request = makeRequest(
      { action: "post_updated", country: "ng", post: { id: 1, slug: "x" } },
      { "x-webhook-secret": "wrong" },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("syncs and revalidates canonical tags on post_updated", async () => {
    const { POST } = await import("./route");
    const request = makeRequest({
      action: "post_updated",
      country: "ng",
      post: { id: 77, slug: "my-story", categorySlugs: ["politics"], tagSlugs: ["breaking"] },
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(syncPostByIdMock).toHaveBeenCalledWith("ng", 77);
    expect(json.revalidated).toEqual(
      expect.arrayContaining([
        "country:ng",
        "home:ng",
        "country:ng:posts",
        "country:ng:post:77",
        "country:ng:post-slug:my-story",
        "country:ng:category:politics",
        "country:ng:tag:breaking",
      ]),
    );
  });

  it("deletes from the index and revalidates on post_deleted", async () => {
    const { POST } = await import("./route");
    const request = makeRequest({ action: "post_deleted", country: "za", post: { id: 5, slug: "old-story" } });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(deletePostFromIndexMock).toHaveBeenCalledWith("za", 5);
    expect(revalidateTagMock).toHaveBeenCalledWith("country:za:post-slug:old-story");
  });

  it("revalidates category tags on category_updated without touching the index", async () => {
    const { POST } = await import("./route");
    const request = makeRequest({ action: "category_updated", country: "za", post: { slug: "Business" } });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(syncPostByIdMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).toHaveBeenCalledWith("country:za:category:business");
  });

  it("falls back to revalidating every country when country is missing", async () => {
    const { POST } = await import("./route");
    const request = makeRequest({ action: "post_updated", post: { id: 1, slug: "x" } });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.revalidated).toEqual(expect.arrayContaining(["country:sz", "country:za", "country:ng"]));
  });

  it("rejects an unknown action", async () => {
    const { POST } = await import("./route");
    const request = makeRequest({ action: "something_else", country: "sz", post: { id: 1, slug: "x" } });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
