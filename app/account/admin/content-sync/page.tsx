import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";
import { getContentSyncStatus } from "@/lib/content-sync/status";
import type { ContentSyncStatus } from "@/lib/supabase/types";
import { COUNTRIES, isValidCountry } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Content sync status",
  description: "Per-edition content indexing health.",
};

/** Human label for each sync status; `null` = no cursor row (never synced). */
const STATUS_LABEL: Record<ContentSyncStatus, string> = {
  idle: "Idle",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

function statusBadge(status: ContentSyncStatus | null) {
  if (status === "completed") return { label: STATUS_LABEL.completed, variant: "default" as const, className: "" };
  if (status === "running") return { label: STATUS_LABEL.running, variant: "secondary" as const, className: "" };
  if (status === "failed")
    return { label: STATUS_LABEL.failed, variant: "outline" as const, className: "border-destructive text-destructive" };
  if (status === "idle") return { label: STATUS_LABEL.idle, variant: "outline" as const, className: "" };
  return { label: "Never synced", variant: "outline" as const, className: "text-muted-foreground" };
}

/**
 * Content-sync monitoring (NOA-15). Admin-gated view of `content_sync_cursor`
 * (per-edition sync status/errors) joined with live `content_index` counts, so
 * indexing failures and stale editions are visible at a glance. The same data
 * is available as JSON at `GET /api/admin/content-sync/status` (secret-gated).
 */
export default async function ContentSyncStatusPage() {
  await requireAdmin("/account/admin/content-sync");
  const { checkedAt, countries, summary } = await getContentSyncStatus();

  const stats: Array<{ label: string; value: number; tone?: "danger" }> = [
    { label: "Editions", value: summary.total },
    { label: "Completed", value: summary.completed },
    { label: "Running", value: summary.running },
    { label: "Failed", value: summary.failed, tone: summary.failed > 0 ? "danger" : undefined },
    { label: "Never synced", value: summary.neverSynced },
    { label: "Indexed articles", value: summary.totalIndexed },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Content sync</h1>
        <p className="body-sm mt-1 text-muted-foreground">
          Per-edition indexing health, checked {formatDate(checkedAt)}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="body-sm text-muted-foreground">{stat.label}</p>
              <p className={cn("heading-md mt-1", stat.tone === "danger" && "text-destructive")}>
                {stat.value.toLocaleString("en")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {countries.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="body-md text-muted-foreground">
              No sync activity yet. Run the content-index backfill to populate editions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {countries.map((edition) => {
            const name = isValidCountry(edition.country)
              ? COUNTRIES[edition.country].name
              : edition.country.toUpperCase();
            const badge = statusBadge(edition.syncStatus);

            return (
              <li key={edition.country}>
                <Card>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="heading-sm">{name}</span>
                      <Badge variant={badge.variant} className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                      <div>
                        <dt className="body-sm text-muted-foreground">Indexed</dt>
                        <dd className="ui-sm">{edition.indexedCount.toLocaleString("en")}</dd>
                      </div>
                      <div>
                        <dt className="body-sm text-muted-foreground">Last synced</dt>
                        <dd className="ui-sm">{edition.lastSyncedAt ? formatDate(edition.lastSyncedAt) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="body-sm text-muted-foreground">Updated</dt>
                        <dd className="ui-sm">{edition.updatedAt ? formatDate(edition.updatedAt) : "—"}</dd>
                      </div>
                    </dl>
                    {edition.errorMessage ? (
                      <p role="alert" className="body-sm text-destructive">
                        {edition.errorMessage}
                      </p>
                    ) : null}
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
