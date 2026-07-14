import Link from "next/link";

import { Container } from "@/components/ui/container";

/**
 * Shared shell for the auth pages (NOA-97/98): login, register,
 * forgot-password and reset-password all render as a centred card.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-12 max-md:min-h-[calc(100dvh-4rem)] max-md:bg-gradient-to-b max-md:from-noa-green-50 max-md:to-background max-md:px-4 max-md:py-6">
      <div className="w-full max-w-md max-md:max-w-none">
        {children}
        <nav
          aria-label="News on Africa app resources"
          className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center"
        >
          <Link
            href="/contact"
            className="ui-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Contact
          </Link>
          <Link
            href="/editorial-guidelines"
            className="ui-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Editorial guidelines
          </Link>
          <Link
            href="/privacy"
            className="ui-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Privacy policy
          </Link>
        </nav>
      </div>
    </Container>
  );
}
