import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Advertise & Partner With Us",
  description:
    "Reach engaged African audiences through News on Africa display, sponsorship and branded-content partnerships.",
  alternates: { canonical: "/advertise" },
};

const PRODUCTS = [
  {
    name: "Homepage Takeover",
    description:
      "High-impact homepage or edition presence for launches, major announcements and concentrated reach.",
  },
  {
    name: "Display Advertising",
    description:
      "Clearly labelled placements across relevant editorial environments, editions and article surfaces.",
  },
  {
    name: "Vertical Sponsorship",
    description:
      "Own a relevant editorial context such as Markets & Money, Culture, Sport or Tech & Innovation.",
  },
  {
    name: "Sponsored Story",
    description:
      "A clearly disclosed paid feature produced or edited to News on Africa editorial and reader-value standards.",
  },
  {
    name: "Partner Series",
    description:
      "A multi-story branded programme around a useful theme, with consistent disclosure and campaign reporting.",
  },
  {
    name: "Country Edition Partnership",
    description:
      "Build sustained visibility with readers in a priority African market, starting with the Eswatini edition.",
  },
] as const;

const MEASUREMENT = [
  "Campaign impressions and clicks",
  "Click-through rate",
  "Sponsored-story views",
  "Edition and placement delivery",
  "Campaign-period reporting",
] as const;

export default function AdvertisePage() {
  return (
    <Container className="max-w-5xl space-y-12 py-10 sm:py-14">
      <header className="max-w-3xl space-y-4">
        <p className="ui-sm font-semibold uppercase tracking-wide text-primary">
          Advertise & partner
        </p>
        <h1 className="heading-lg">Reach Africa in context.</h1>
        <p className="body-lg text-muted-foreground">
          News on Africa gives brands a credible editorial environment for reaching readers through
          country editions, high-value verticals, display inventory and clearly disclosed sponsored
          storytelling.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="mailto:info@newsonafrica.com?subject=Advertising%20enquiry%20-%20News%20on%20Africa"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
          >
            Request a campaign
          </a>
          <Link
            href="/editorial-guidelines"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 py-2.5 font-semibold text-foreground"
          >
            Read our editorial standards
          </Link>
        </div>
      </header>

      <section className="space-y-5" aria-labelledby="commercial-products">
        <div className="max-w-2xl space-y-2">
          <h2 id="commercial-products" className="heading-md">
            Commercial products
          </h2>
          <p className="body-md text-muted-foreground">
            Start with a focused product, then combine placements into a campaign that matches your
            objective, market and editorial context.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((product) => (
            <article key={product.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="heading-sm">{product.name}</h3>
              <p className="mt-2 body-sm text-muted-foreground">{product.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-border bg-muted/30 p-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="heading-md">Measured, not merely placed.</h2>
          <p className="body-md text-muted-foreground">
            Campaign reporting is being standardised around first-party delivery and engagement
            signals. We only report metrics we can substantiate.
          </p>
          <ul className="space-y-2 body-md text-foreground">
            {MEASUREMENT.map((metric) => (
              <li key={metric}>• {metric}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h2 className="heading-md">Brand safety and reader trust.</h2>
          <p className="body-md text-muted-foreground">
            Paid content is clearly disclosed. Commercial partnerships do not buy editorial
            conclusions, and sponsored stories remain distinct from independent newsroom coverage.
          </p>
          <Link
            href="/editorial-guidelines"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Review News on Africa editorial guidelines →
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <h2 className="heading-md">Plan a campaign with us</h2>
          <p className="body-md text-muted-foreground">
            Tell us the market you want to reach, your objective, campaign dates and the type of
            partnership you are considering. We will shape the right inventory around that brief.
          </p>
          <a
            href="mailto:info@newsonafrica.com?subject=Advertising%20enquiry%20-%20News%20on%20Africa"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
          >
            Email the commercial team
          </a>
        </div>
      </section>
    </Container>
  );
}
