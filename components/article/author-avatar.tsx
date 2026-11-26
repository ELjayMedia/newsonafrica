"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** "Thandeka Nxumalo" → "TN"; one word → its first two letters. */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NA";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

/**
 * Author photo, or their initials on a green disc when there is no photo (or
 * the photo fails, e.g. WordPress's default Gravatar placeholder).
 */
export function AuthorAvatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const ref = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    // A photo that already failed before hydration never fires onError.
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  // Ask Gravatar for a 404 instead of its grey silhouette, so a missing photo
  // falls back to initials.
  const url = src ? src.replace(/([?&])d=[^&]*/, "$1d=404") : null;
  const usable = url && !failed;

  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "shrink-0 items-center justify-center overflow-hidden rounded-full bg-noa-green-50 font-display text-[0.75rem] font-extrabold text-noa-green-text",
        className,
      )}
    >
      {usable ? (
        // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted avatar
        <img
          ref={ref}
          src={url}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialsFor(name)
      )}
    </span>
  );
}
