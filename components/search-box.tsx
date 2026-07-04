"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { isValidCountry, type CountryCode } from "@/lib/countries";
import { buildSearchUrl, MIN_SUGGESTION_QUERY_LENGTH, normalizeSearchQuery } from "@/lib/search/params";
import type { SearchSuggestion } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

/** Current country edition from the URL, if any — scopes suggestions/results. */
function countryFromPath(pathname: string): CountryCode | null {
  const segment = pathname.split("/")[1];
  return segment && isValidCountry(segment) ? segment : null;
}

function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Called after navigating (submit or suggestion pick) — e.g. to close the mobile panel. */
  onNavigate?: () => void;
}

/**
 * Debounced search combobox with type-ahead suggestions (NOA-95).
 *
 * Fetches `/api/search/suggest` ~250ms after the user stops typing (scoped
 * to the current country edition when on one). Implements the ARIA combobox
 * pattern: arrow keys move through suggestions, Enter opens the active
 * suggestion's article (or submits the query), Escape closes the list.
 * Submitting navigates to `/search?q=…` via the shared URL builder.
 */
export function SearchBox({ className, placeholder = "Search news…", autoFocus = false, onNavigate }: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const country = countryFromPath(pathname);

  const listboxId = React.useId();
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Debounced suggestion fetch, aborted when the query changes or on unmount.
  React.useEffect(() => {
    const normalized = normalizeSearchQuery(query);
    if (normalized.length < MIN_SUGGESTION_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: normalized });
        if (country) params.set("country", country);

        const response = await fetch(`/api/search/suggest?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) return;

        const data = (await response.json()) as { suggestions?: SearchSuggestion[] };
        const next = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[search-box] suggestion fetch failed", error);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, country]);

  const navigate = React.useCallback(
    (href: string) => {
      setOpen(false);
      setActiveIndex(-1);
      router.push(href);
      onNavigate?.();
    },
    [router, onNavigate],
  );

  const submitQuery = React.useCallback(() => {
    const normalized = normalizeSearchQuery(query);
    if (!normalized) return;
    navigate(buildSearchUrl({ query: normalized, country }));
  }, [query, country, navigate]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        // Cycle through -1 (no active option) then each suggestion.
        const count = suggestions.length;
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = (current + delta + count + 1) % (count + 1);
        return next === count ? -1 : next;
      });
      return;
    }

    if (event.key === "Enter") {
      const active = open && activeIndex >= 0 ? suggestions[activeIndex] : undefined;
      if (active) {
        event.preventDefault();
        navigate(active.url);
      }
      // Otherwise fall through to the form's onSubmit.
    }
  };

  return (
    <div className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuery();
        }}
      >
        <MagnifierIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-label="Search news"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            // Delay so clicks on suggestions (which fire after blur) still land.
            setTimeout(() => {
              setOpen(false);
              setActiveIndex(-1);
            }, 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in, only used when the mobile panel opens
          autoFocus={autoFocus}
          className={cn(
            "h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />
      </form>

      <ul
        id={listboxId}
        role="listbox"
        aria-label="Search suggestions"
        className={cn(
          "absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-background py-1 shadow-lg",
          open && suggestions.length > 0 ? "block" : "hidden",
        )}
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion.country}-${suggestion.slug}`}
            id={`${listboxId}-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            // onMouseDown so the pick fires before the input's blur closes the list.
            onMouseDown={(event) => {
              event.preventDefault();
              navigate(suggestion.url);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={cn(
              "cursor-pointer px-3 py-2 text-sm",
              index === activeIndex ? "bg-accent text-accent-foreground" : "text-foreground",
            )}
          >
            <span className="line-clamp-2">{suggestion.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Header mount for the search box (NOA-95): inline input on md+ screens; on
 * smaller screens a magnifier icon button toggles a full-width search bar
 * pinned just below the sticky header.
 */
export function HeaderSearch() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the mobile panel after any navigation.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <SearchBox className="hidden w-48 md:block lg:w-64" />

      <button
        type="button"
        aria-label={mobileOpen ? "Close search" : "Open search"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input md:hidden"
      >
        <MagnifierIcon className="h-4 w-4" />
      </button>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background p-3 md:hidden">
          <SearchBox autoFocus onNavigate={() => setMobileOpen(false)} />
        </div>
      ) : null}
    </>
  );
}
