import { Container } from "@/components/ui/container";

/**
 * Shared shell for the auth pages (NOA-97/98): login, register,
 * forgot-password and reset-password all render as a centred card.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">{children}</div>
    </Container>
  );
}
