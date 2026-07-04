import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { removeBookmarkAction } from "@/lib/bookmarks/actions";
import { COUNTRIES, isValidCountry } from "@/lib/countries";
import { listBookmarks } from "@/lib/dal/bookmarks";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Saved articles",
  description: "Articles you bookmarked on News on Africa.",
};

/** Saved-articles list (NOA-100): every bookmark, newest first, with remove. */
export default async function BookmarksPage() {
  await requireUser("/account/bookmarks");
  const bookmarks = await listBookmarks();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Saved articles</h1>
        <p className="body-sm mt-1 text-muted-foreground">
          {bookmarks.length === 0
            ? "Articles you save will appear here."
            : `${bookmarks.length} saved ${bookmarks.length === 1 ? "article" : "articles"}.`}
        </p>
      </div>

      {bookmarks.length === 0 ? (
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
          {bookmarks.map((bookmark) => {
            const countryName = isValidCountry(bookmark.country)
              ? COUNTRIES[bookmark.country].name
              : bookmark.country.toUpperCase();

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
                        {bookmark.title ?? bookmark.slug.replace(/-/g, " ")}
                      </Link>
                      {bookmark.excerpt ? (
                        <p className="body-sm line-clamp-2 text-muted-foreground">{bookmark.excerpt}</p>
                      ) : null}
                      <p className="body-sm text-muted-foreground">
                        {countryName} · Saved {formatDate(bookmark.savedAt)}
                      </p>
                    </div>

                    <form action={removeBookmarkAction} className="shrink-0 self-start">
                      <input type="hidden" name="bookmarkId" value={bookmark.id} />
                      <Button type="submit" variant="ghost" size="sm" aria-label={`Remove ${bookmark.title ?? bookmark.slug} from saved articles`}>
                        Remove
                      </Button>
                    </form>
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
