import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/wordpress-api", () => ({
  getPostBySlugForCountry: vi.fn(),
  getLatestPostsForCountry: vi.fn(),
}));

import ArticlePage from "./page";
import { getPostBySlugForCountry } from "@/lib/wordpress-api";

describe("ArticlePage", () => {
  it("renders fallback content when WordPress is unreachable", async () => {
    vi.mocked(getPostBySlugForCountry).mockRejectedValue(new Error("Service Unavailable"));
    const ui = await ArticlePage({ params: Promise.resolve({ countryCode: "sz", slug: "test" }) });
    render(ui);
    expect(
      screen.getByText("Article temporarily unavailable")
    ).toBeInTheDocument();
  });
});

