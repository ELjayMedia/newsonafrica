import Link from "next/link";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="display-lg text-primary">404</p>
      <h1 className="heading-lg mt-2">Page not found</h1>
      <p className="body-md mt-2 text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link href="/" className={buttonVariants()}>
          Back to home
        </Link>
      </div>
    </Container>
  );
}
