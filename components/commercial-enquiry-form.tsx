"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitCommercialEnquiry } from "@/lib/commercial/actions";
import { COMMERCIAL_PRODUCTS, type CommercialEnquiryInput } from "@/lib/commercial/validation";

const PRODUCT_LABELS: Record<(typeof COMMERCIAL_PRODUCTS)[number], string> = {
  "homepage-takeover": "Homepage takeover",
  "display-advertising": "Display advertising",
  "vertical-sponsorship": "Vertical sponsorship",
  "sponsored-story": "Sponsored story",
  "partner-series": "Partner series",
  "country-edition-partnership": "Country edition partnership",
  "newsletter-sponsorship": "Newsletter sponsorship",
};

export function CommercialEnquiryForm() {
  const [status, setStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const productInterest = COMMERCIAL_PRODUCTS.filter((product) => data.getAll("productInterest").includes(product));

    const input: CommercialEnquiryInput = {
      organisation: String(data.get("organisation") ?? ""),
      contactName: String(data.get("contactName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      market: String(data.get("market") ?? ""),
      objective: String(data.get("objective") ?? ""),
      campaignTiming: String(data.get("campaignTiming") ?? ""),
      budgetRange: String(data.get("budgetRange") ?? ""),
      productInterest,
      notes: String(data.get("notes") ?? ""),
      sourcePath: "/advertise",
      consent: data.get("consent") === "on",
    };

    startTransition(async () => {
      const result = await submitCommercialEnquiry(input);
      setStatus(result.ok ? "success" : "error");
      setMessage(result.message);
      if (result.ok) form.reset();
    });
  };

  if (status === "success") {
    return (
      <div role="status" className="rounded-xl border border-border bg-muted/30 p-5">
        <p className="heading-sm">Enquiry received.</p>
        <p className="mt-2 body-md text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organisation" htmlFor="commercial-organisation">
          <Input id="commercial-organisation" name="organisation" autoComplete="organization" required disabled={pending} />
        </Field>
        <Field label="Your name" htmlFor="commercial-name">
          <Input id="commercial-name" name="contactName" autoComplete="name" required disabled={pending} />
        </Field>
        <Field label="Work email" htmlFor="commercial-email">
          <Input id="commercial-email" name="email" type="email" autoComplete="email" required disabled={pending} />
        </Field>
        <Field label="Phone / WhatsApp (optional)" htmlFor="commercial-phone">
          <Input id="commercial-phone" name="phone" type="tel" autoComplete="tel" disabled={pending} />
        </Field>
        <Field label="Market / country you want to reach" htmlFor="commercial-market">
          <Input id="commercial-market" name="market" placeholder="e.g. Eswatini, Southern Africa" required disabled={pending} />
        </Field>
        <Field label="Campaign timing (optional)" htmlFor="commercial-timing">
          <Input id="commercial-timing" name="campaignTiming" placeholder="e.g. November 2026" disabled={pending} />
        </Field>
      </div>

      <Field label="What should the campaign achieve?" htmlFor="commercial-objective">
        <textarea
          id="commercial-objective"
          name="objective"
          rows={4}
          required
          disabled={pending}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Tell us the audience, message and outcome you are aiming for."
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Products you are considering</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {COMMERCIAL_PRODUCTS.map((product) => (
            <label key={product} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input type="checkbox" name="productInterest" value={product} disabled={pending} className="h-4 w-4" />
              <span>{PRODUCT_LABELS[product]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Budget range (optional)" htmlFor="commercial-budget">
          <Input id="commercial-budget" name="budgetRange" placeholder="e.g. E25,000–E50,000" disabled={pending} />
        </Field>
        <Field label="Anything else we should know? (optional)" htmlFor="commercial-notes">
          <Input id="commercial-notes" name="notes" disabled={pending} />
        </Field>
      </div>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input type="checkbox" name="consent" required disabled={pending} className="mt-1 h-4 w-4" />
        <span>
          I agree that News on Africa may use these details to respond to this commercial enquiry.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Request a campaign"}
        </Button>
        <a
          href="mailto:info@newsonafrica.com?subject=Advertising%20enquiry%20-%20News%20on%20Africa"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Or email info@newsonafrica.com
        </a>
      </div>

      {message ? (
        <p role={status === "error" ? "alert" : "status"} className={status === "error" ? "body-sm text-destructive" : "body-sm text-muted-foreground"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
