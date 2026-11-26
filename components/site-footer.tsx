import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { Container } from "@/components/ui/container";
import { DEFAULT_COUNTRY, PUBLIC_COUNTRY_LIST } from "@/lib/countries";
import type { NavSection } from "@/lib/nav";

const COMPANY_LINKS = [
  { href: "/advertise", label: "Advertise" },
  { href: "/editorial-guidelines", label: "Editorial guidelines" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy policy" },
] as const;

const LINK =
  "ui-sm inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title} className="space-y-3">
      <h2 className="noa-eyebrow text-[0.6875rem] tracking-[0.16em] text-noa-faint">{title}</h2>
      <ul className="grid gap-x-4 sm:gap-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={LINK}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Site footer: brand and mission, edition / section / company links, and the
 * newsletter. Sections are the same top categories as the header nav.
 */
export function SiteFooter({ sections = [] }: { sections?: NavSection[] }) {
  const editions = [
    { href: "/", label: "Africa" },
    ...PUBLIC_COUNTRY_LIST.map((c) => ({ href: `/${c.code}`, label: c.name })),
  ];
  const sectionLinks = sections.map((s) => ({
    href: `/${DEFAULT_COUNTRY}/category/${s.slug}`,
    label: s.name,
  }));

  return (
    <footer className="mt-auto border-t border-border bg-noa-white">
      <Container className="max-w-[var(--noa-well-w)] space-y-10 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" aria-label="News On Africa home" className="inline-block">
              <BrandMark glyphSize={28} />
            </Link>
            <p className="body-sm max-w-xs text-muted-foreground">
              Independent African journalism: news, business and culture from the continent&rsquo;s
              country editions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <FooterColumn title="Editions" links={editions} />
            <FooterColumn title="Sections" links={sectionLinks} />
            <FooterColumn title="News On Africa" links={COMPANY_LINKS} />
          </div>
        </div>

        {/* Newsletter capture (NOA-129): global owned-audience sign-up. */}
        <div className="flex flex-col gap-3 rounded-[10px] bg-noa-paper p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md space-y-1">
            <p className="heading-sm text-foreground">The Africa brief, weekly.</p>
            <p className="body-sm text-muted-foreground">
              Business, markets and the creative economy — the stories that matter, once a week.
            </p>
          </div>
          <NewsletterSignup source="footer" />
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="body-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} News on Africa. All rights reserved.
          </p>
          <p className="ui-sm text-muted-foreground">Independent African journalism.</p>
        </div>
      </Container>
    </footer>
  );
}
