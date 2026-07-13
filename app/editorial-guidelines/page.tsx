import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Editorial Guidelines",
  description: "News on Africa editorial standards for accuracy, corrections and disclosure.",
  alternates: { canonical: "/editorial-guidelines" },
};

const LAST_UPDATED = "13 July 2026";

export default function EditorialGuidelinesPage() {
  return (
    <Container className="max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <p className="ui-sm font-semibold uppercase tracking-wide text-primary">
          Journalistic standards
        </p>
        <h1 className="heading-lg">Editorial guidelines</h1>
        <p className="body-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <p className="body-md text-foreground">
          News on Africa publishes independent reporting, analysis and service journalism across
          African country editions. These guidelines describe how we prepare, review, update and
          correct editorial work, and how we separate journalism from commercial content.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Accuracy and review</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>
            Authors are expected to submit clear, sourced stories with titles, bylines, excerpts,
            categories and image alt text.
          </li>
          <li>
            Editors review stories before publication for accuracy, context, fairness, clarity and
            appropriate metadata.
          </li>
          <li>
            Breaking stories may start short, but updates should improve the same article rather
            than fragmenting a developing event into duplicates.
          </li>
          <li>
            When a story is updated, the site revalidates the affected pages and search index so
            readers receive the current version.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Corrections and updates</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>
            Minor spelling, formatting or style fixes may be corrected in place without a note.
          </li>
          <li>
            Substantive updates to developing stories should include a visible updated timestamp or
            an update note.
          </li>
          <li>
            Factual corrections require a visible dated correction note explaining what changed.
          </li>
          <li>
            Article metadata includes machine-readable modified dates so search engines and other
            services can identify updated stories.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Commercial independence</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>Commercial relationships must not override newsroom judgment.</li>
          <li>
            Sponsored, partner or advertising placements must be clearly labelled before readers
            engage deeply with the content.
          </li>
          <li>Commercial labels must be visually distinct from editorial category labels.</li>
          <li>
            Sponsored editorial content should remain useful to readers and meet News on Africa
            editorial standards.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Reader trust</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>
            News on Africa does not currently use third-party advertising or analytics trackers in
            the app.
          </li>
          <li>
            Readers can create accounts, save articles, comment, and request account deletion
            through the published account-deletion process.
          </li>
          <li>
            Questions about editorial standards, privacy or data can be sent to{" "}
            <a
              href="mailto:privacy@newsonafrica.com"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              privacy@newsonafrica.com
            </a>
            .
          </li>
        </ul>
      </section>
    </Container>
  );
}
