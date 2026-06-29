import Link from "next/link";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="ui-sm uppercase tracking-wide text-primary">Greenfield rebuild</p>
        <h1 className="display-lg mt-3">News on Africa</h1>
        <p className="body-lg mt-4 text-muted-foreground">
          Foundation phase is live. Content (headless WordPress), accounts (Supabase), and
          subscriptions (Paystack) arrive in upcoming phases.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/design-system" className={buttonVariants()}>
            View design system
          </Link>
        </div>
      </div>
    </Container>
  );
}
