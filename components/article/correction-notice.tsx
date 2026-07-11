import type { CorrectionEntry } from "@/lib/dal/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Dated correction / update notes on an article (NOA-139). Rendered as a
 * visually distinct block (amber, left-ruled) so it never reads as body copy or
 * an editorial badge, per the corrections policy in docs/editorial-workflow.md.
 * Its dates line up with the `dateModified` we emit in the article JSON-LD.
 */
export interface CorrectionNoticeProps {
  entries: CorrectionEntry[];
  className?: string;
}

export function CorrectionNotice({ entries, className }: CorrectionNoticeProps) {
  if (entries.length === 0) return null;

  return (
    <aside
      aria-label="Corrections and updates"
      className={cn(
        "space-y-2 rounded-lg border border-l-4 border-amber-300 border-l-amber-500 bg-amber-50 p-4",
        "text-amber-950 dark:border-amber-900 dark:border-l-amber-500 dark:bg-amber-950/30 dark:text-amber-100",
        className,
      )}
    >
      {entries.map((entry, index) => (
        <p key={`${entry.date}-${index}`} className="body-sm">
          <span className="font-semibold">
            {entry.kind === "correction" ? "Correction" : "Update"}
            {entry.date ? <>, <time dateTime={entry.date}>{formatDate(entry.date)}</time></> : null}:
          </span>{" "}
          {entry.note}
        </p>
      ))}
    </aside>
  );
}
