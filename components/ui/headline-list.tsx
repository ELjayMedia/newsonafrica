'use client';
import { designTokens, componentStyles, combineTokens } from './design-tokens';

export type HeadlineItem = {
  id?: string | number;
  title: string;
  href: string;
};

type HeadlineListProps = {
  items: HeadlineItem[];
  max?: number;
  numbered?: boolean;
  className?: string;
};

/**
 * HeadlineList
 * - Renders an ordered, numbered list with a large, light-gray number in the left column
 * - Headlines render as accessible links on the right, wrapping to multiple lines
 * - Defaults to 5 items, numbered
 */
export function HeadlineList({ items, max = 5, numbered = true, className }: HeadlineListProps) {
  const data = (items || []).slice(0, max);

  return (
    <ol className={combineTokens('space-y-5', className || '')}>
      {data.map((item, idx) => {
        const n = idx + 1;
        return (
          <li key={item.id ?? item.href} className="grid grid-cols-[2rem_1fr] gap-3">
            <span
              aria-hidden="true"
              className={combineTokens(
                'select-none font-extrabold',
                designTokens.typography.special.number,
                designTokens.colors.text.muted,
              )}
            >
              {numbered ? n : ''}
            </span>
            <a
              href={item.href}
              className={combineTokens(
                componentStyles.linkBase,
                designTokens.typography.headline.medium,
              )}
            >
              {item.title}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export default HeadlineList;
