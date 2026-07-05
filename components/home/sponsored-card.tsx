/**
 * In-feed native ad (design system §05: "Advertising is a first-class citizen").
 * A sponsored unit styled to sit in the story flow but clearly marked with a
 * gold "SPONSORED" label and a "Paid partnership" disclosure, per the design
 * system's disclosure rule. Renders as demo inventory now; an ad server drops
 * real creative in without changing the frame.
 */
export interface SponsoredCardProps {
  advertiser?: string;
  headline?: string;
}

export function SponsoredCard({
  advertiser = "Acme Telecom",
  headline = "5G is rewriting how Africa connects — here's what it means for your business.",
}: SponsoredCardProps) {
  return (
    <aside
      aria-label="Sponsored content"
      className="overflow-hidden rounded-xl border border-[#e7d9b0] bg-[#fffdf7]"
    >
      <div className="border-b border-[#e7d9b0] bg-[#faf3df] px-5 py-2">
        <span className="noa-eyebrow text-[0.6875rem] tracking-[0.14em] text-[#a07d24]">
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
          <p className="font-display text-lg font-extrabold leading-[1.1] tracking-[-0.01em] text-noa-ink">
            {headline}
          </p>
          <p className="mt-2 text-xs font-semibold text-noa-faint">Paid partnership</p>
        </div>
      </div>
    </aside>
  );
}
