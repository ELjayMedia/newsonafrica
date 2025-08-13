import React from 'react';

export function OrganizationJsonLd({ name, url, logo }: { name: string; url: string; logo?: string }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export function WebsiteJsonLd({ name, url }: { name: string; url: string }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; item: string }[] }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: it.item,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export function NewsArticleJsonLd(props: {
  url: string;
  title: string;
  images?: string[];
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName?: string;
}) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': props.url,
    },
    headline: props.title,
    image: props.images,
    datePublished: props.datePublished,
    dateModified: props.dateModified || props.datePublished,
    author: {
      '@type': 'Person',
      name: props.authorName,
    },
    publisher: props.publisherName
      ? { '@type': 'Organization', name: props.publisherName }
      : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
