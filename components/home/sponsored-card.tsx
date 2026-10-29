import { cn } from "@/lib/utils";

/**
 * In-feed native ad (design system §05: "Advertising is a first-class citizen").
 * A sponsored unit styled to sit in the story flow but clearly marked with a
 * gold "SPONSORED" label and a "Paid partnership" disclosure, per the design
 * system's disclosure rule. It renders only when real/explicit preview campaign
 * data is supplied; production never falls back to fictional sponsor copy.
 */
export interface SponsoredCardProps {
  advertiser?: string;
  headline?: string;
  disclosure?: string;
  className?: string;
}

export function SponsoredCard({
  advertiser,
  headline,
  disclosure = "Paid partnership",
  className,
}: SponsoredCardProps) {
  if (!advertiser || !headline) return null;

  // The cream sponsored surface is fixed in both themes, so its text uses fixed
  // ink/muted values rather than the theme-aware noa-* neutrals.

  return (
    <aside
      aria-label="Sponsored content"
      className={cn("overflow-hidden rounded-xl border border-[#e7d9b0] bg-[#fffdf7]", className)}
    >
      <div className="border-b border-[#e7d9b0] bg-[#faf3df] px-5 py-2">
        <span className="noa-eyebrow text-[0.6875rem] tracking-[0.14em] text-[#7d6116]">
          Sponsored · {advertiser}
        </span>
      </div>
      <div className="flex items-center gap-4 p-5">
        <div
          aria-hidden
          className="h-24 w-32 shrink-0 rounded-lg"
          style={{ background: "linear-gradient(135deg,#c9a227,#8a6d16)" }}
        />
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold leading-[1.1] tracking-[-0.01em] text-[#161412]">
            {headline}
          </p>
          <p className="mt-2 text-xs font-semibold text-[#6e6a66]">{disclosure}</p>
        </div>
      </div>
    </aside>
  );
}
