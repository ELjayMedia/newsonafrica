import Link from "next/link";

/**
 * Full-bleed utility bar (homepage mockup): a thin dark strip that spans the
 * whole viewport above the floating content well, carrying the subscribe
 * call-to-action and the account/sign-in slot. Stays full width (over the
 * takeover skin gutters) while the masthead below it lives inside the well.
 */
export function UtilityBar({ accountSlot }: { accountSlot?: React.ReactNode }) {
  return (
    <div className="relative z-10 bg-[#0c0c0c] text-white">
      <div className="mx-auto flex h-11 max-w-[var(--noa-well-w)] items-center justify-between gap-4 px-4 sm:px-6">
        <p className="truncate text-xs font-medium text-white/70 sm:text-[0.8125rem]">
          Stay informed. <span className="hidden sm:inline">Subscribe for full access.</span>
        </p>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-full bg-noa-green px-4 font-display text-xs font-extrabold text-white transition-colors hover:bg-noa-green-bright sm:px-4"
          >
            Subscribe
          </Link>
          {accountSlot}
        </div>
      </div>
    </div>
  );
}
