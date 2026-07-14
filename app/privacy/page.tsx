import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How News on Africa collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

/** Last substantive review of this policy. Update when the policy changes. */
const LAST_UPDATED = "12 July 2026";

/**
 * Privacy policy (NOA-135). A live, accessible privacy route is required for
 * PWA/TWA readiness and Google Play submission. The content reflects the app's
 * actual data practices (Supabase auth/storage, first-party newsletter, no
 * third-party analytics at time of writing).
 */
export default function PrivacyPolicyPage() {
  return (
    <Container className="max-w-3xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="heading-lg">Privacy Policy</h1>
        <p className="body-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <p className="body-md text-foreground">
          News on Africa (&ldquo;News on Africa&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an
          independent pan-African news service. This policy explains what personal information we
          collect when you use our website and app, how we use it, and the choices you have. By
          using News on Africa you agree to this policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Information we collect</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>
            <span className="font-semibold">Account information.</span> When you create an account
            we collect your email address (via our authentication provider) and any profile details
            you add — display name, avatar image, preferred edition/country, and interests.
          </li>
          <li>
            <span className="font-semibold">Your activity.</span> Articles you save (bookmarks) and
            comments you post, including any reports you submit about other comments.
          </li>
          <li>
            <span className="font-semibold">Newsletter.</span> If you subscribe, we store your email
            address and the page or campaign you signed up from.
          </li>
          <li>
            <span className="font-semibold">Technical data.</span> Standard server and security logs
            (such as IP address and request metadata) generated when you access the service, used to
            operate and protect it.
          </li>
        </ul>
        <p className="body-sm text-muted-foreground">
          We do not currently use third-party advertising or analytics trackers. If that changes, we
          will update this policy first.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">How we use your information</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>To provide the service — sign-in, your profile, saved articles, and comments.</li>
          <li>To send the newsletter you subscribed to, and let you unsubscribe.</li>
          <li>
            To moderate comments and keep the community safe (including handling reported comments).
          </li>
          <li>To secure the service, prevent abuse, and comply with legal obligations.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">How your information is stored and shared</h2>
        <p className="body-md text-foreground">
          Your data is stored with our infrastructure providers, who process it on our behalf under
          their own security and privacy commitments:{" "}
          <span className="font-semibold">Supabase</span> (database, authentication, and image
          storage) and <span className="font-semibold">Vercel</span> (application hosting). Article
          content is managed in our WordPress content system.
        </p>
        <p className="body-md text-foreground">
          We do not sell your personal information. We share it only with these service providers as
          needed to run News on Africa, or where required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Cookies</h2>
        <p className="body-md text-foreground">
          We use only essential cookies — to keep you signed in and to remember your preferred
          edition. We do not use cookies for advertising.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Your choices and rights</h2>
        <ul className="body-md list-disc space-y-2 pl-5 text-foreground">
          <li>View and update your profile details at any time from your account.</li>
          <li>Edit or delete your own comments, and remove saved articles.</li>
          <li>Unsubscribe from the newsletter using the link in any newsletter email.</li>
          <li>
            Delete your account and associated reader data from{" "}
            <Link
              href="/account-deletion"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              the account deletion page
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Children</h2>
        <p className="body-md text-foreground">
          News on Africa is intended for a general audience and is not directed at children under
          13. We do not knowingly collect personal information from children under 13.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Changes to this policy</h2>
        <p className="body-md text-foreground">
          We may update this policy from time to time. Material changes will be reflected by the
          &ldquo;Last updated&rdquo; date above, and where appropriate we will notify you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="heading-sm">Contact us</h2>
        <p className="body-md text-foreground">
          Questions about this policy or your data? Email us at{" "}
          <a
            href="mailto:info@newsonafrica.com"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            info@newsonafrica.com
          </a>
          .
        </p>
      </section>
    </Container>
  );
}
