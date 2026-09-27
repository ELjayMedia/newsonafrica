import { z } from "zod";

export const COMMERCIAL_PRODUCTS = [
  "homepage-takeover",
  "display-advertising",
  "vertical-sponsorship",
  "sponsored-story",
  "partner-series",
  "country-edition-partnership",
  "newsletter-sponsorship",
] as const;

export const commercialEnquirySchema = z.object({
  organisation: z.string().trim().min(2, "Enter your organisation name.").max(160),
  contactName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(50).optional(),
  market: z.string().trim().min(2, "Tell us the market you want to reach.").max(120),
  objective: z.string().trim().min(5, "Tell us what the campaign should achieve.").max(600),
  campaignTiming: z.string().trim().max(200).optional(),
  budgetRange: z.string().trim().max(120).optional(),
  productInterest: z.array(z.enum(COMMERCIAL_PRODUCTS)).max(COMMERCIAL_PRODUCTS.length).default([]),
  notes: z.string().trim().max(2000).optional(),
  sourcePath: z.string().trim().max(512).optional(),
  sourceCampaign: z.string().trim().max(120).optional(),
  consent: z
    .boolean()
    .refine((value) => value, "Please agree to be contacted about this enquiry."),
});

export type CommercialEnquiryInput = z.input<typeof commercialEnquirySchema>;
