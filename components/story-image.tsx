"use client";

import * as React from "react";

import { AFRICA_STROKE, AfricaGlyph } from "@/components/africa-glyph";
import { cn } from "@/lib/utils";

/**
 * Branded stand-in for a story without a usable image: a soft green wash with
 * a fine diagonal pattern, the News On Africa glyph (Africa outline) and (on larger frames) the
 * section name. One look everywhere, in both themes.
 */
export function StoryImagePlaceholder({
  label,
  size = "md",
  className,
}: {
  label?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "noa-placeholder flex h-full w-full flex-col items-center justify-center gap-2 text-noa-green",
        className,
      )}
    >
      <AfricaGlyph
        color="currentColor"
        // Small frames get the heavier icon stroke so the outline stays legible.
        strokeWidth={size === "lg" ? AFRICA_STROKE.mark : AFRICA_STROKE.icon}
        className={cn(
          "opacity-60",
          size === "sm" ? "h-6 w-6" : size === "md" ? "h-10 w-10" : "h-16 w-16",
        )}
      />
      {label && size !== "sm" ? (
        <span className="noa-eyebrow max-w-[80%] truncate text-[0.625rem] tracking-[0.18em] text-noa-green-text/80">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export interface StoryImageProps {
  src?: string | null;
  alt?: string;
  /** Section name shown on the placeholder when there is no image. */
  label?: string | null;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
}

/**
 * A story's image, or the branded placeholder when there is none or it fails
 * to load (old CMS URLs from the archive rebuild can 404).
 */
export function StoryImage({
  src,
  alt = "",
  label,
  size = "md",
  priority = false,
  className,
}: StoryImageProps) {
  const [failed, setFailed] = React.useState(false);
  const ref = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    // An image that already failed before hydration never fires onError.
    const img = ref.current;
    setFailed(Boolean(img && img.complete && img.naturalWidth === 0));
  }, [src]);

  if (!src || failed) return <StoryImagePlaceholder label={label} size={size} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted images
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
        className,
      )}
    />
  );
}
