import { SponsoredCard } from "@/components/home/sponsored-card";
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

function countWords(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
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
      className={cn("prose-article max-w-none", className)}
      // eslint-disable-next-line react/no-danger -- sanitized via DOMPurify (lib/sanitize-html.ts)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function MobileArticleSponsor({ position }: { position: "first" | "second" }) {
  const headline =
    position === "first"
      ? "Useful context from a News On Africa partner, placed after the story begins."
      : "More insight for readers following this story in depth.";

  return (
    <div className="lg:hidden">
      <SponsoredCard
        advertiser="News On Africa Partner"
        headline={headline}
        disclosure="Clearly marked sponsored placement"
      />
    </div>
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
      <MobileArticleSponsor position="first" />
      <ArticleHtmlChunk html={betweenAds} className={className} />
      {shouldShowSecondMobileAd ? <MobileArticleSponsor position="second" /> : null}
      <ArticleHtmlChunk html={afterSecondAd} className={className} />
    </>
  );
}
