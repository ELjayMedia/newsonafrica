"use client";

import * as React from "react";

import type { SponsorInfo } from "@/lib/dal/types";
import { cn } from "@/lib/utils";

interface SponsoredArticleDisclosureProps {
  sponsor: SponsorInfo;
  editionCode: string;
  articleId: number;
  vertical?: string;
  variant?: "header" | "footer";
  className?: string;
}

function getSessionId(): string {
  const key = "noa.analytics.session";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

function safeCtaUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function sendCampaignEvent({
  eventType,
  sponsor,
  editionCode,
  articleId,
  vertical,
}: {
  eventType: "impression" | "click";
  sponsor: SponsorInfo;
  editionCode: string;
  articleId: number;
  vertical?: string;
}) {
  if (!sponsor.campaignId) return;

  await fetch("/api/ads/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventType,
      placementType: "native",
      campaignId: sponsor.campaignId,
      sponsorName: sponsor.sponsorName,
      editionCode,
      country: editionCode,
      vertical: vertical ?? null,
      articleId,
      sessionId: getSessionId(),
    }),
  }).catch(() => {
    // Commercial telemetry must never interrupt article reading.
  });
}

export function SponsoredArticleDisclosure({
  sponsor,
  editionCode,
  articleId,
  vertical,
  variant = "header",
  className,
}: SponsoredArticleDisclosureProps) {
  const impressionSent = React.useRef(false);
  const ctaUrl = safeCtaUrl(sponsor.ctaUrl);

  React.useEffect(() => {
    if (!sponsor.isSponsored || impressionSent.current) return;
    impressionSent.current = true;
    void sendCampaignEvent({
      eventType: "impression",
      sponsor,
      editionCode,
      articleId,
      vertical,
    });
  }, [sponsor, editionCode, articleId, vertical]);

  if (!sponsor.isSponsored) return null;

  if (variant === "footer") {
    return (
      <aside
        className={cn("rounded-xl border border-border bg-muted/30 p-4", className)}
        aria-label="Sponsored content disclosure"
      >
        <p className="ui-sm font-semibold uppercase tracking-wide text-foreground">
          Commercial disclosure
        </p>
        <p className="mt-2 body-sm text-muted-foreground">
          This paid feature was supported by {sponsor.sponsorName}. News on Africa keeps
          commercial partnerships separate from independent newsroom judgment.
        </p>
      </aside>
    );
  }

  const label = sponsor.disclosureLabel || `Paid partnership with ${sponsor.sponsorName}`;

  return (
    <aside
      className={cn("rounded-xl border border-border bg-muted/30 p-4", className)}
      aria-label="Sponsored content"
    >
      <p className="ui-sm font-semibold uppercase tracking-[0.12em] text-foreground">Sponsored</p>
      <p className="mt-1 body-sm font-semibold text-foreground">{label}</p>
      {sponsor.sponsorTier ? (
        <p className="mt-1 ui-sm text-muted-foreground">{sponsor.sponsorTier}</p>
      ) : null}
      {ctaUrl ? (
        <a
          href={ctaUrl}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={() =>
            void sendCampaignEvent({
              eventType: "click",
              sponsor,
              editionCode,
              articleId,
              vertical,
            })
          }
          className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {sponsor.ctaLabel || "Learn more"}
        </a>
      ) : null}
    </aside>
  );
}
