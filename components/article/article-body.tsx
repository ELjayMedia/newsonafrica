import { AdSlot } from "@/components/ads/ad-slot";
import { countWords } from "@/lib/article/reading-time";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

export interface ArticleBodyProps {
  /** Raw `content.rendered` HTML from WordPress; sanitized here before render. */
  html: string;
  className?: string;
}

const FIRST_MOBILE_AD_AFTER_PARAGRAPHS = 4;
const SECOND_MOBILE_AD_AFTER_PARAGRAPHS = 9;
const LONG_ARTICLE_WORD_COUNT = 800;

function countParagraphs(html: string): number {
  return html.match(/<\/p>/gi)?.length ?? 0;
}

function splitAfterParagraphs(html: string, paragraphCount: number): [string, string] {
  const paragraphCloseRegex = /<\/p>/gi;
  let seen = 0;
  let match: RegExpExecArray | null;

  while ((match = paragraphCloseRegex.exec(html)) !== null) {
    seen += 1;

    if (seen === paragraphCount) {
      const splitAt = match.index + match[0].length;
      return [html.slice(0, splitAt), html.slice(splitAt)];
    }
  }

  return [html, ""];
}

function ArticleHtmlChunk({ html, className }: { html: string; className?: string }) {
  if (!html) return null;

  return (
    <div
      className={cn("prose-article max-w-[68ch]", className)}
      // eslint-disable-next-line react/no-danger -- sanitized via DOMPurify (lib/sanitize-html.ts)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * In-article ad break: the mobile zone below lg, and (first break only) the
 * desktop in-article zone from lg. Both collapse until Revive fills them.
 */
function ArticleAdBreak({ position }: { position: "first" | "second" }) {
  return (
    <>
      <AdSlot
        placement={position === "first" ? "mobile-inarticle-mpu-1" : "mobile-inarticle-mpu-2"}
        className="my-6"
      />
      {position === "first" ? <AdSlot placement="desktop-inarticle-mpu" className="my-8" /> : null}
    </>
  );
}

/** Renders sanitized WordPress article HTML with article typography (NOA-90). */
export function ArticleBody({ html, className }: ArticleBodyProps) {
  const sanitized = sanitizeArticleHtml(html);
  const paragraphCount = countParagraphs(sanitized);
  const wordCount = countWords(sanitized);
  const shouldShowFirstMobileAd = paragraphCount >= FIRST_MOBILE_AD_AFTER_PARAGRAPHS;
  const shouldShowSecondMobileAd =
    wordCount >= LONG_ARTICLE_WORD_COUNT && paragraphCount >= SECOND_MOBILE_AD_AFTER_PARAGRAPHS;

  if (!shouldShowFirstMobileAd) {
    return <ArticleHtmlChunk html={sanitized} className={className} />;
  }

  const [beforeFirstAd, afterFirstAd] = splitAfterParagraphs(
    sanitized,
    FIRST_MOBILE_AD_AFTER_PARAGRAPHS,
  );
  const paragraphsBetweenAds =
    SECOND_MOBILE_AD_AFTER_PARAGRAPHS - FIRST_MOBILE_AD_AFTER_PARAGRAPHS;
  const [betweenAds, afterSecondAd]: [string, string] = shouldShowSecondMobileAd
    ? splitAfterParagraphs(afterFirstAd, paragraphsBetweenAds)
    : [afterFirstAd, ""];

  return (
    <>
      <ArticleHtmlChunk html={beforeFirstAd} className={className} />
      <ArticleAdBreak position="first" />
      <ArticleHtmlChunk html={betweenAds} className={className} />
      {shouldShowSecondMobileAd ? <ArticleAdBreak position="second" /> : null}
      <ArticleHtmlChunk html={afterSecondAd} className={className} />
    </>
  );
}
