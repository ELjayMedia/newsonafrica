import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  safeNextPath,
} from "@/lib/auth/validation";

describe("loginSchema", () => {
  it("accepts a valid email + password and normalizes the email", () => {
    const result = loginSchema.safeParse({ email: "  Reader@Example.COM ", password: "hunter22" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("reader@example.com");
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.co", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("requires at least 8 password characters", () => {
    const result = registerSchema.safeParse({
      email: "a@b.co",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched password confirmation on the confirmPassword field", () => {
    const result = registerSchema.safeParse({
      email: "a@b.co",
      password: "longenough",
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeTruthy();
    }
  });

  it("accepts matching valid input", () => {
    const result = registerSchema.safeParse({
      email: "a@b.co",
      password: "longenough",
      confirmPassword: "longenough",
    });
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema / resetPasswordSchema", () => {
  it("validates the reset request email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("applies the same password policy on reset", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "longenough", confirmPassword: "longenough" }).success,
    ).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success).toBe(
      false,
    );
  });
});

describe("safeNextPath", () => {
  it("allows same-origin paths", () => {
    expect(safeNextPath("/profile")).toBe("/profile");
    expect(safeNextPath("/sz/article/some-story")).toBe("/sz/article/some-story");
  });

  it("falls back for absolute, protocol-relative, or missing values", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined, "/login")).toBe("/login");
    expect(safeNextPath("\\evil")).toBe("/");
  });
});
