import { cn } from "@/lib/utils";

/**
 * News On Africa lockup (design system §01): the green pin/leaf glyph beside the
 * stacked "NEWS ON / AFRICA" wordmark in Archivo Black, with AFRICA tracked and
 * in brand green. `glyphSize` sizes the pin so the mark can shrink for compact
 * contexts (e.g. the mobile masthead) without duplicating markup.
 */
export function BrandMark({
  className,
  glyphSize = 30,
}: {
  className?: string;
  glyphSize?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 100 100"
        aria-hidden
        className="shrink-0"
      >
        <path
          d="M50 8 C58 8 64 10 70 12 C76 14 82 14 84 20 C86 26 82 30 80 36 C78 42 80 46 78 52 C76 60 70 66 64 74 C60 80 58 88 52 92 C48 95 44 90 43 84 C42 78 38 74 34 68 C30 62 26 58 24 50 C22 42 20 34 22 28 C24 22 30 20 36 16 C42 12 44 8 50 8 Z"
          fill="var(--noa-green)"
        />
      </svg>
      <span className="noa-wordmark leading-[0.9]">
        <span className="block text-[1.35rem] text-noa-ink">NEWS ON</span>
        <span className="block text-[1.35rem] tracking-[0.18em] text-noa-green">AFRICA</span>
      </span>
    </span>
  );
}
