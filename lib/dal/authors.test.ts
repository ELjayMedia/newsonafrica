import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchWordPressGraphQL: vi.fn(),
}));

vi.mock("@/lib/wordpress/graphql-client", () => ({
  fetchWordPressGraphQL: mocks.fetchWordPressGraphQL,
}));

import { listAuthors } from "@/lib/dal/authors";

describe("listAuthors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchWordPressGraphQL.mockResolvedValue({
      ok: true,
      data: {
        users: {
          nodes: [
            {
              databaseId: 1,
              name: "Staff Reporter",
              slug: "staff-reporter",
              description: "",
              avatar: null,
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      },
    });
  });

  it.each(["sz", "za", "ng"])(
    "uses the schema-compatible user ordering input for %s",
    async (country) => {
      const result = await listAuthors({ country, page: 1, perPage: 10 });

      expect(result.items).toHaveLength(1);
      expect(mocks.fetchWordPressGraphQL).toHaveBeenCalledTimes(1);

      const [, query, variables, options] = mocks.fetchWordPressGraphQL.mock.calls[0];
      expect(query).toContain("orderby: { field: DISPLAY_NAME, order: ASC }");
      expect(query).not.toContain("orderby: NAME");
      expect(variables).toEqual({ first: 10 });
      expect(options).toMatchObject({ operationName: "Authors" });
    },
  );
});
