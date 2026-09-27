import Link from "next/link";

import { NewsletterSignup } from "@/components/newsletter-signup";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container className="space-y-8 py-8">
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

        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="body-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} News on Africa. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
            <Link
              href="/editorial-guidelines"
              className="ui-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Editorial Guidelines
            </Link>
            <Link
              href="/advertise"
              className="ui-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Advertise
            </Link>
            <Link
              href="/contact"
              className="ui-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="ui-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy Policy
            </Link>
            <p className="ui-sm text-muted-foreground">Independent African journalism.</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
