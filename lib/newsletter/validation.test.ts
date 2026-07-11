import { describe, expect, it } from "vitest";

import { isProbablyValidEmail, newsletterSignupSchema } from "@/lib/newsletter/validation";

describe("newsletterSignupSchema", () => {
  it("accepts a valid email and lower-cases it", () => {
    const result = newsletterSignupSchema.safeParse({ email: "Reader@Example.COM" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("reader@example.com");
  });

  it("trims surrounding whitespace", () => {
    const result = newsletterSignupSchema.safeParse({ email: "  hi@noa.africa  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("hi@noa.africa");
  });

  it("rejects empty and malformed emails", () => {
    expect(newsletterSignupSchema.safeParse({ email: "" }).success).toBe(false);
    expect(newsletterSignupSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(newsletterSignupSchema.safeParse({ email: "a@b" }).success).toBe(false);
  });

  it("normalizes optional source fields and drops blanks", () => {
    const result = newsletterSignupSchema.safeParse({
      email: "x@y.com",
      editionCode: "SZ",
      sourceVertical: "business",
      sourceCampaign: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.editionCode).toBe("sz");
      expect(result.data.sourceVertical).toBe("business");
      expect(result.data.sourceCampaign).toBeUndefined();
    }
  });

  it("rejects an invalid edition code and unsafe tags", () => {
    expect(newsletterSignupSchema.safeParse({ email: "x@y.com", editionCode: "zzz" }).success).toBe(false);
    expect(
      newsletterSignupSchema.safeParse({ email: "x@y.com", sourceVertical: "drop table" }).success,
    ).toBe(false);
  });
});

describe("isProbablyValidEmail", () => {
  it("mirrors the schema's email rule for the client gate", () => {
    expect(isProbablyValidEmail("reader@example.com")).toBe(true);
    expect(isProbablyValidEmail("nope")).toBe(false);
    expect(isProbablyValidEmail("")).toBe(false);
  });
});
