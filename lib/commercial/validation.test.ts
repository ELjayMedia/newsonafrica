import { describe, expect, it } from "vitest";

import { commercialEnquirySchema } from "./validation";

const valid = {
  organisation: "Example Brand",
  contactName: "A Buyer",
  email: "buyer@example.com",
  market: "Eswatini",
  objective: "Build awareness for a new service.",
  productInterest: ["sponsored-story"] as const,
  consent: true as const,
};

describe("commercialEnquirySchema", () => {
  it("accepts a qualified minimal enquiry", () => {
    expect(commercialEnquirySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(commercialEnquirySchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("requires consent", () => {
    expect(commercialEnquirySchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("rejects unknown commercial products", () => {
    expect(
      commercialEnquirySchema.safeParse({ ...valid, productInterest: ["made-up-product"] }).success,
    ).toBe(false);
  });
});
