"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

/** Route-level error UI (NOA-84). Catches render errors below the layout. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Next.js already reports server errors through onRequestError.
    if (!error.digest) captureException(error);
  }, [error]);

  return (
    <Container className="py-24 text-center">
      <h1 className="heading-lg">Something went wrong</h1>
      <p className="body-md mt-2 text-muted-foreground">
        An unexpected error occurred while loading this page.
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}
