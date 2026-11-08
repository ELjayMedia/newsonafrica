import Link from "next/link";

import { NewsletterSignup } from "@/components/newsletter-signup";
import { Container } from "@/components/ui/container";

const FOOTER_LINKS = [
  { href: "/editorial-guidelines", label: "Editorial Guidelines" },
  { href: "/advertise", label: "Advertise" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-noa-white">
      <Container className="max-w-[var(--noa-well-w)] space-y-8 py-8">
        {/* Newsletter capture (NOA-129): global owned-audience sign-up. */}
        <div className="flex flex-col gap-3 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-1">
            <p className="heading-sm text-foreground">The Africa brief, weekly.</p>
            <p className="body-sm text-muted-foreground">
              Business, markets and the creative economy — the stories that matter, once a week.
            </p>
          </div>
          <NewsletterSignup source="footer" />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Links get 44px rows on touch layouts (two columns on phones) and
              collapse to an inline row from sm up. */}
          <nav aria-label="Footer" className="sm:order-2">
            <ul className="grid grid-cols-2 gap-x-4 sm:flex sm:flex-wrap sm:justify-end sm:gap-x-5 sm:gap-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="ui-sm inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-1 sm:order-1">
            <p className="body-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} News on Africa. All rights reserved.
            </p>
            <p className="ui-sm text-muted-foreground">Independent African journalism.</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
