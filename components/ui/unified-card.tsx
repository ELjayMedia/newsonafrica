'use client';

import { formatDistanceToNow } from 'date-fns';
import { Clock, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useMemo } from 'react';

import { designTokens, componentStyles, combineTokens } from './design-tokens';

interface UnifiedCardProps {
  post: {
    id: string;
    title: string;
    excerpt?: string;
    slug: string;
    featuredImage?: { sourceUrl: string } | { node: { sourceUrl: string } };
    date: string;
    author?: {
      node: { name: string };
    };
    categories?: {
      nodes: Array<{
        name: string;
        slug: string;
      }>;
    };
    type?: string;
  };

  // Layout variants
  variant?: 'horizontal' | 'vertical' | 'minimal' | 'featured';

  // Display options
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showCategory?: boolean;
  showDate?: boolean;

  // Styling
  className?: string;
  imageAspect?: 'square' | 'wide' | 'tall';

  // Behavior
  allowHtml?: boolean;
}

export const UnifiedCard = memo(function UnifiedCard({
  post,
  variant = 'horizontal',
  showExcerpt = false,
  showAuthor = true,
  showCategory = true,
  showDate = true,
  className = '',
  imageAspect = 'wide',
  allowHtml = false,
}: UnifiedCardProps) {
  const formattedDate = useMemo(() => {
    if (!showDate || !post.date) return null;
    return formatDistanceToNow(new Date(post.date), { addSuffix: true });
  }, [post.date, showDate]);

  const imageUrl = useMemo(() => {
    if (!post.featuredImage) return '/placeholder.svg';
    if ('sourceUrl' in post.featuredImage) {
      return post.featuredImage.sourceUrl;
    }
    if ('node' in post.featuredImage) {
      return post.featuredImage.node.sourceUrl;
    }
    return '/placeholder.svg';
  }, [post.featuredImage]);

  const category = showCategory ? post.categories?.nodes?.[0] : null;
  const author = showAuthor ? post.author?.node : null;

  const getImageDimensions = () => {
    switch (variant) {
      case 'minimal':
        return { width: 'w-16', height: 'h-12' };
      case 'horizontal':
        return { width: 'w-20', height: 'h-16' };
      case 'vertical':
        return { width: 'w-full', height: 'h-32' };
      case 'featured':
        return { width: 'w-full', height: 'h-48' };
      default:
        return { width: 'w-20', height: 'h-16' };
    }
  };

  const imageDimensions = getImageDimensions();

  const renderMetaInfo = () => (
    <div className={componentStyles.metaInfo}>
      {showDate && formattedDate && (
        <>
          <Clock className="h-3 w-3" />
          <span>{formattedDate}</span>
        </>
      )}
      {author && showDate && <span>•</span>}
      {author && (
        <>
          <User className="h-3 w-3" />
          <span className="truncate">{author.name}</span>
        </>
      )}
    </div>
  );

  const renderCategory = () => {
    if (!category) return null;
    return (
      <span
        className={combineTokens(
          designTokens.colors.brand.accent,
          designTokens.typography.meta.accent,
          designTokens.spacing.padding.xs,
          designTokens.radius.sm,
        )}
      >
        {category.name}
      </span>
    );
  };

  if (variant === 'minimal') {
    return (
      <Link
        href={`/post/${post.slug}`}
        className={combineTokens(
          'block',
          designTokens.colors.states.hover,
          designTokens.transitions.colors,
          className,
        )}
      >
        <article
          className={combineTokens(
            designTokens.spacing.padding.sm,
            'border-b border-gray-100 last:border-b-0',
          )}
        >
          <div
            className={combineTokens(designTokens.layout.flex.start, designTokens.spacing.gap.sm)}
          >
            <div
              className={combineTokens(
                imageDimensions.width,
                imageDimensions.height,
                'flex-shrink-0',
                componentStyles.imageContainer,
              )}
            >
              <Image
                src={imageUrl || '/placeholder.svg'}
                alt={post.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={componentStyles.headlineSecondary}>{post.title}</h3>
              {renderMetaInfo()}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === 'vertical') {
    return (
      <Link href={`/post/${post.slug}`} className={combineTokens('block group h-full', className)}>
        <article
          className={combineTokens(
            componentStyles.cardInteractive,
            designTokens.layout.flex.col,
            'h-full overflow-hidden',
          )}
        >
          <div
            className={combineTokens(
              imageDimensions.width,
              imageDimensions.height,
              componentStyles.imageContainer,
            )}
          >
            <Image
              src={imageUrl || '/placeholder.svg'}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            {category && <div className="absolute top-2 left-2">{renderCategory()}</div>}
          </div>

          <div className={combineTokens(designTokens.spacing.padding.md, 'flex-1 flex flex-col')}>
            {post.type && (
              <div className={combineTokens(designTokens.typography.meta.accent, 'mb-1')}>
                {post.type}
              </div>
            )}

            <h3
              className={combineTokens(
                componentStyles.headlinePrimary,
                'group-hover:text-blue-600 transition-colors duration-200 mb-2',
              )}
            >
              {post.title}
            </h3>

            {showExcerpt && post.excerpt && (
              <p
                className={combineTokens(
                  designTokens.typography.body.small,
                  designTokens.colors.text.muted,
                  'line-clamp-2 mb-2',
                )}
              >
                {allowHtml ? (
                  <span dangerouslySetInnerHTML={{ __html: post.excerpt }} />
                ) : (
                  post.excerpt
                )}
              </p>
            )}

            <div className="mt-auto">{renderMetaInfo()}</div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <Link href={`/post/${post.slug}`} className={combineTokens('block group', className)}>
        <article className={combineTokens(componentStyles.cardInteractive, 'overflow-hidden')}>
          <div
            className={combineTokens(
              imageDimensions.width,
              imageDimensions.height,
              componentStyles.imageContainer,
            )}
          >
            <Image
              src={imageUrl || '/placeholder.svg'}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {category && <div className="absolute top-3 left-3">{renderCategory()}</div>}
          </div>

          <div className={designTokens.spacing.padding.lg}>
            <h2
              className={combineTokens(
                designTokens.typography.headline.large,
                'group-hover:text-blue-600 transition-colors duration-200 mb-3',
              )}
            >
              {post.title}
            </h2>

            {showExcerpt && post.excerpt && (
              <p
                className={combineTokens(
                  designTokens.typography.body.medium,
                  designTokens.colors.text.muted,
                  'line-clamp-3 mb-3',
                )}
              >
                {allowHtml ? (
                  <span dangerouslySetInnerHTML={{ __html: post.excerpt }} />
                ) : (
                  post.excerpt
                )}
              </p>
            )}

            {renderMetaInfo()}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/post/${post.slug}`} className={combineTokens('block group', className)}>
      <article
        className={combineTokens(
          componentStyles.cardInteractive,
          'flex flex-col sm:flex-row overflow-hidden',
        )}
      >
        <div className={combineTokens('sm:w-1/3 h-40 sm:h-auto', componentStyles.imageContainer)}>
          <Image
            src={imageUrl || '/placeholder.svg'}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>

        <div
          className={combineTokens(
            'sm:w-2/3 flex-1',
            designTokens.spacing.padding.lg,
            designTokens.layout.flex.col,
            'justify-between',
          )}
        >
          <div>
            {category && <div className="mb-2">{renderCategory()}</div>}

            <h3
              className={combineTokens(
                componentStyles.headlinePrimary,
                'group-hover:text-blue-600 transition-colors duration-200 mb-2',
              )}
            >
              {post.title}
            </h3>

            {showExcerpt && post.excerpt && (
              <p
                className={combineTokens(
                  designTokens.typography.body.medium,
                  designTokens.colors.text.muted,
                  'line-clamp-3 mb-3',
                )}
              >
                {allowHtml ? (
                  <span dangerouslySetInnerHTML={{ __html: post.excerpt }} />
                ) : (
                  post.excerpt
                )}
              </p>
            )}
          </div>

          {renderMetaInfo()}
        </div>
      </article>
    </Link>
  );
});
