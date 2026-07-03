import { cn } from "@/lib/utils";

/**
 * Inline status banner for the auth forms (NOA-97/98): error (destructive)
 * and success (subtle) variants, announced politely to screen readers.
 */
export function FormAlert({
  tone,
  children,
  className,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "body-sm rounded-md border px-3 py-2",
        tone === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Per-field validation message list keyed to an input via `id`. */
export function FieldErrors({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="body-sm mt-1 text-destructive">
      {errors.join(" ")}
    </p>
  );
}
