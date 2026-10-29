"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Round 44px icon button shared by the article action icons. */
export const ARTICLE_ICON_BUTTON =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-input text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

export interface ShareMenuButtonProps {
  title: string;
  /** Fully-qualified article URL. */
  url: string;
  className?: string;
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

/**
 * Single share control for an article (NOA-90): opens the device's native
 * share sheet where available (WhatsApp, Telegram, etc. on phones) and
 * otherwise a small menu of share targets plus copy-link.
 */
export function ShareMenuButton({ title, url, className }: ShareMenuButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    {
      label: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: "Email", href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ] as const;

  // Close the fallback menu on outside click or Escape.
  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleClick = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Dismissing the sheet is not an error; anything else falls back to the menu.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setOpen((value) => !value);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently ignore.
    }
  };

  const itemClass =
    "ui-md flex min-h-11 w-full items-center px-4 text-left text-foreground transition-colors hover:bg-accent md:min-h-10";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Share this article"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={ARTICLE_ICON_BUTTON}
      >
        <ShareIcon />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Share this article"
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          {links.map((link) => (
            <a
              key={link.label}
              role="menuitem"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              {link.label}
            </a>
          ))}
          <button type="button" role="menuitem" onClick={handleCopy} className={itemClass}>
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      ) : null}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
