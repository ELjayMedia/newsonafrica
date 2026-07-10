import type { Metadata } from "next";
import Link from "next/link";

import { RemoveBookmarkButton } from "@/components/remove-bookmark-button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { COUNTRIES, isValidCountry } from "@/lib/countries";
import { listBookmarks } from "@/lib/dal/bookmarks";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Saved articles",
  description: "Articles you bookmarked on News on Africa.",
};

/** Saved-articles list (NOA-100/NOA-19): every bookmark, newest first, with
 * remove, an error state (load failure) and an empty state. */
export default async function BookmarksPage() {
  await requireUser("/account/bookmarks");
  const bookmarks = await listBookmarks();
  const loadFailed = bookmarks === null;
  const items = bookmarks ?? [];

  const subheading = loadFailed
    ? "We couldn't load your saved articles."
    : items.length === 0
      ? "Articles you save will appear here."
      : `${items.length} saved ${items.length === 1 ? "article" : "articles"}.`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Saved articles</h1>
        <p className="body-sm mt-1 text-muted-foreground">{subheading}</p>
      </div>

      {loadFailed ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6" role="alert">
            <p className="body-md text-muted-foreground">
              Something went wrong loading your saved articles. Please try again in a moment.
            </p>
            <Link
              href="/account/bookmarks"
              className="ui-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Try again
            </Link>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="body-md text-muted-foreground">
              You haven&apos;t saved any articles yet. Tap <span className="font-medium text-foreground">Save</span> on
              any article to keep it here for later.
            </p>
            <Link href="/" className="ui-sm font-medium text-primary underline-offset-4 hover:underline">
              Browse the latest news
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((bookmark) => {
            const countryName = isValidCountry(bookmark.country)
              ? COUNTRIES[bookmark.country].name
              : bookmark.country.toUpperCase();
            const displayTitle = bookmark.title ?? bookmark.slug.replace(/-/g, " ");

            return (
              <li key={bookmark.id}>
                <Card>
                  <CardContent className="flex gap-4 p-4">
                    {bookmark.featuredImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
                      <img
                        src={bookmark.featuredImageUrl}
                        alt=""
                        className="hidden h-20 w-28 shrink-0 rounded-md object-cover sm:block"
                      />
                    ) : null}

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link href={bookmark.url} className="heading-sm hover:text-primary">
                        {displayTitle}
                      </Link>
                      {bookmark.excerpt ? (
                        <p className="body-sm line-clamp-2 text-muted-foreground">{bookmark.excerpt}</p>
                      ) : null}
                      <p className="body-sm text-muted-foreground">
                        {countryName} · Saved {formatDate(bookmark.savedAt)}
                      </p>
                    </div>

                    <RemoveBookmarkButton bookmarkId={bookmark.id} title={displayTitle} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
