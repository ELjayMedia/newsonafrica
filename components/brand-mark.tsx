import { AfricaGlyph } from "@/components/africa-glyph";
import { cn } from "@/lib/utils";

/**
 * News On Africa lockup (brand refresh, Option A "Broken Line"): the stroked
 * Africa outline beside the stacked lowercase wordmark "news on / Africa" in
 * Archivo Bold. "Africa" is set 1.305× larger so its ink width matches "news on"
 * (measured against the self-hosted Archivo file).
 *
 * The whole mark is sized in `em`, so the font size on the wrapper scales it:
 * pass a `text-[…]` class (the size of the "news on" line) to resize, including
 * responsively (`text-[1.15rem] md:text-[1.5rem]`). Default is 1.5rem.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-[0.3em] text-[1.5rem]", className)}>
      <AfricaGlyph
        color="currentColor"
        className="h-[2.3em] w-[2.3em] shrink-0 text-noa-green dark:text-noa-green-bright"
      />
      <span className="flex flex-col gap-[0.08em] font-display font-bold leading-[0.9] whitespace-nowrap">
        <span className="tracking-[-0.02em] text-noa-ink">news on</span>
        <span className="text-[1.305em] text-noa-green dark:text-noa-green-bright">Africa</span>
      </span>
    </span>
  );
}
