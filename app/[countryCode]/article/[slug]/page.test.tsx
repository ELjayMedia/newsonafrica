import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/wordpress-api", () => ({
  getLatestPostsForCountry: vi.fn(),
}));
vi.mock("@/lib/wp", () => ({
  fetchPost: vi.fn(),
}));

import ArticlePage from "./page";
import { fetchPost } from "@/lib/wp";

describe("ArticlePage", () => {
  it("renders fallback content when WordPress is unreachable", async () => {
    vi.mocked(fetchPost).mockRejectedValue(new Error("Service Unavailable"));
    const ui = await ArticlePage({ params: { countryCode: "sz", slug: "test" } });
    render(ui);
    expect(
      screen.getByText("Article temporarily unavailable")
    ).toBeInTheDocument();
  });
});
