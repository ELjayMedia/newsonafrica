import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container className="flex flex-col items-center justify-between gap-2 py-8 sm:flex-row">
        <p className="body-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} News on Africa. All rights reserved.
        </p>
        <p className="ui-sm text-muted-foreground">Independent African journalism.</p>
      </Container>
    </footer>
  );
}
