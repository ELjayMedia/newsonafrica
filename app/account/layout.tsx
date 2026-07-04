import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/session";

/**
 * Protected account area (NOA-99). `requireUser()` redirects signed-out
 * visitors to /login with a return path; every page below /account inherits
 * the guard.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account/profile");

  return (
    <Container className="py-10">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </Container>
  );
}
