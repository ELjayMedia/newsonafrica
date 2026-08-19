"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ShareButtonsProps {
  title: string;
  /** Fully-qualified article URL. */
  url: string;
  className?: string;
  /** Render a low-chrome inline row for constrained mobile article layouts. */
  compact?: boolean;
}

const LINK_CLASS =
  "inline-flex h-9 items-center justify-center rounded-full border border-input px-3 ui-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
const COMPACT_LINK_CLASS =
  "ui-sm font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

/** Social share links + copy-to-clipboard for an article (NOA-90). */
export function ShareButtons({ title, url, className, compact = false }: ShareButtonsProps) {
  const [copied, setCopied] = React.useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: "WhatsApp", href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Email", href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ] as const;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently ignore.
    }
  };

  if (compact) {
    const compactLinks = [links[2], links[0]];

    return (
      <div
        className={cn("flex items-center gap-2 overflow-x-auto whitespace-nowrap", className)}
        role="group"
        aria-label="Share this article"
      >
        <span className="ui-sm font-semibold text-foreground">Share</span>
        {compactLinks.map((link) => (
          <React.Fragment key={link.label}>
            <span aria-hidden className="ui-sm text-muted-foreground">
              ·
            </span>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={COMPACT_LINK_CLASS}
            >
              {link.label}
            </a>
          </React.Fragment>
        ))}
        <span aria-hidden className="ui-sm text-muted-foreground">
          ·
        </span>
        <button type="button" onClick={handleCopy} className={COMPACT_LINK_CLASS}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Share this article"
    >
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {link.label}
        </a>
      ))}
      <button type="button" onClick={handleCopy} className={LINK_CLASS}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
