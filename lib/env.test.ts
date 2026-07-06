import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

describe("server env validation", () => {
  afterEach(() => {
    vi.resetModules();
    process.env = ORIGINAL_ENV;
  });

  it("does not require admin-only secrets when reading public WordPress config", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      WORDPRESS_API_URL: "https://newsonafrica.com",
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      WORDPRESS_WEBHOOK_SECRET: undefined,
      CONTENT_SYNC_SECRET: "short",
    };

    const { serverEnv } = await import("@/lib/env");

    expect(serverEnv.WORDPRESS_API_URL).toBe("https://newsonafrica.com");
  });
});
