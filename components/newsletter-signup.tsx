"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToNewsletter } from "@/lib/newsletter/actions";
import { isProbablyValidEmail } from "@/lib/newsletter/validation";
import { cn } from "@/lib/utils";

/**
 * Newsletter capture (NOA-129). A compact email form that posts to the
 * service-role server action, with client-side validation to fail fast and
 * pending/success/error states. `vertical` / `campaign` / `edition` / `source`
 * feed subscriber source tracking for per-vertical, per-campaign attribution.
 */
export interface NewsletterSignupProps {
  /** Editorial/commercial vertical the capture point sits in (e.g. "business"). */
  vertical?: string;
  /** Campaign tag for attribution. */
  campaign?: string;
  /** Edition the reader is signing up from (sz/za/ng). */
  edition?: string;
  /** Where the form lives, for attribution (e.g. "footer"). */
  source?: string;
  className?: string;
}

export function NewsletterSignup({ vertical, campaign, edition, source, className }: NewsletterSignupProps) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    if (!isProbablyValidEmail(email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    startTransition(async () => {
      const result = await subscribeToNewsletter({
        email,
        editionCode: edition,
        sourceVertical: vertical,
        sourceCampaign: campaign,
        sourcePath: source,
      });
      setStatus(result.ok ? "success" : "error");
      setMessage(result.message);
      if (result.ok) setEmail("");
    });
  };

  if (status === "success") {
    return (
      <p role="status" className={cn("body-sm text-foreground", className)}>
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full max-w-sm space-y-2", className)} noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          aria-invalid={status === "error"}
          aria-describedby={message ? "newsletter-message" : undefined}
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      {message ? (
        <p
          id="newsletter-message"
          role={status === "error" ? "alert" : "status"}
          className={cn("body-sm", status === "error" ? "text-destructive" : "text-muted-foreground")}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
