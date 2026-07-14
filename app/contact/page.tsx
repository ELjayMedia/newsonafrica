import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact News on Africa for editorial, support and app enquiries.",
  alternates: { canonical: "/contact" },
};

const CONTACTS = [
  {
    label: "Email",
    value: "info@newsonafrica.com",
    href: "mailto:info@newsonafrica.com",
  },
  {
    label: "Eswatini phone",
    value: "+268 7696 7131",
    href: "tel:+26876967131",
  },
  {
    label: "South Africa phone",
    value: "+27 83 942 793",
    href: "tel:+2783942793",
  },
];

export default function ContactPage() {
  return (
    <Container className="max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <p className="ui-sm font-semibold uppercase tracking-wide text-primary">Contact</p>
        <h1 className="heading-lg">Contact News on Africa</h1>
        <p className="body-md text-muted-foreground">
          For editorial questions, app support, privacy requests or general enquiries, reach the
          News on Africa team through the contact details below.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Contact details">
        {CONTACTS.map((contact) => (
          <article
            key={contact.href}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <h2 className="ui-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {contact.label}
            </h2>
            <a
              href={contact.href}
              className="mt-2 block break-words font-display text-lg font-extrabold text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {contact.value}
            </a>
          </article>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-muted/40 p-5">
        <h2 className="heading-sm">Editorial and app support</h2>
        <p className="body-md text-foreground">
          Please include the article title or app screen you are asking about, plus any correction,
          source, account or device details that will help us respond.
        </p>
      </section>
    </Container>
  );
}
