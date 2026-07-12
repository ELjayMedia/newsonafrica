import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Account Deletion",
  description: "How to delete your News on Africa account and associated reader data.",
  alternates: { canonical: "/account-deletion" },
};

export default function AccountDeletionPage() {
  return (
    <Container className="max-w-3xl space-y-7 py-10">
      <header className="space-y-2">
        <h1 className="heading-lg">Account deletion</h1>
        <p className="body-md text-muted-foreground">
          News on Africa account holders can delete their account from profile settings after
          signing in.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="heading-sm">What is deleted</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>Your Supabase Auth sign-in account.</li>
          <li>Your profile details, avatar, edition preference and account settings.</li>
          <li>Your saved articles and newsletter subscription tied to the account email.</li>
          <li>
            Your comments and comment reports are removed or converted into deleted placeholders.
          </li>
          <li>Search logs tied to your account are disconnected from your user ID.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Before you continue</h2>
        <p className="body-md text-foreground">
          Account deletion is permanent. You can keep reading News on Africa without an account, but
          saved articles, profile details and account-only activity cannot be restored after
          deletion.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/login?next=%2Faccount%2Fprofile" className={buttonVariants()}>
          Sign in to delete account
        </Link>
        <Link href="/privacy" className={buttonVariants({ variant: "outline" })}>
          Privacy Policy
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="heading-sm">Need help?</h2>
        <p className="body-md text-foreground">
          If you cannot sign in, email{" "}
          <a
            href="mailto:privacy@newsonafrica.com"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            privacy@newsonafrica.com
          </a>{" "}
          from the address on your account.
        </p>
      </section>
    </Container>
  );
}
