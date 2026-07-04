"use client";

import * as React from "react";
import Link from "next/link";

import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Signed-in account dropdown (NOA-99): avatar (or display-name initial)
 * trigger, Profile link and Sign out. Closes on outside click and Escape.
 */
export function AccountMenuClient({
  displayName,
  email,
  avatarUrl,
  isAdmin = false,
}: {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  /** Shows the moderation link (NOA-102); the page itself re-checks server-side. */
  isAdmin?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const initial = (displayName.trim() || "?").slice(0, 1).toUpperCase();

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-input bg-muted transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase-storage-hosted avatar; remote patterns not configured for next/image
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="ui-md font-semibold text-muted-foreground">{initial}</span>
        )}
      </button>

      <div
        role="menu"
        aria-label="Account"
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
          open ? "block" : "hidden",
        )}
      >
        <div className="px-3 py-2">
          <p className="ui-sm truncate font-medium">{displayName}</p>
          {email ? <p className="body-sm truncate text-muted-foreground">{email}</p> : null}
        </div>
        <div className="my-1 h-px bg-border" aria-hidden />
        <Link
          role="menuitem"
          href="/account/profile"
          onClick={() => setOpen(false)}
          className="ui-sm block rounded-sm px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Profile
        </Link>
        <Link
          role="menuitem"
          href="/account/bookmarks"
          onClick={() => setOpen(false)}
          className="ui-sm block rounded-sm px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Saved articles
        </Link>
        {isAdmin ? (
          <Link
            role="menuitem"
            href="/account/admin/comments"
            onClick={() => setOpen(false)}
            className="ui-sm block rounded-sm px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Comment moderation
          </Link>
        ) : null}
        <form action={signOutAction} role="none">
          <button
            role="menuitem"
            type="submit"
            className="ui-sm block w-full rounded-sm px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
