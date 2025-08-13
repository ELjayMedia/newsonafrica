import { siteConfig } from '@/config/site';

export interface SchemaOrgProps {
  url: string;
  title?: string;
  description?: string;
  images?: string[];
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  authorUrl?: string;
  publisherName?: string;
  publisherLogo?: string;
  type?: string;
}

// Base NewsMediaOrganization schema for the entire site
export function getNewsMediaOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    '@id': `${siteConfig.url}/#organization`,
    name: 'News On Africa',
    url: siteConfig.url,
    logo: {
      '@type': 'ImageObject',
      url: `${siteConfig.url}/logo.png`,
      width: 600,
      height: 60,
    },
    sameAs: [
      'https://twitter.com/newsonafrica',
      'https://facebook.com/newsonafrica',
      'https://linkedin.com/company/newsonafrica',
      'https://instagram.com/newsonafrica',
    ],
    diversityPolicy: `${siteConfig.url}/diversity-policy`,
    ethicsPolicy: `${siteConfig.url}/ethics-policy`,
    masthead: `${siteConfig.url}/about`,
    foundingDate: '2023-01-01',
    slogan: 'Where the Continent Connects',
    description:
      'A pan-African news platform providing comprehensive coverage across the continent',
    knowsAbout: [
      'African Politics',
      'African Business',
      'African Sports',
      'African Entertainment',
      'African Health',
      'African Technology',
    ],
    publishingPrinciples: `${siteConfig.url}/editorial-standards`,
    actionableFeedbackPolicy: `${siteConfig.url}/feedback-policy`,
    correctionsPolicy: `${siteConfig.url}/corrections-policy`,
    unnamedSourcesPolicy: `${siteConfig.url}/unnamed-sources-policy`,
    verificationFactCheckingPolicy: `${siteConfig.url}/fact-checking-policy`,
    diversityStaffingReport: `${siteConfig.url}/diversity-report`,
    ownershipFundingInfo: `${siteConfig.url}/ownership-info`,
    founder: {
      '@type': 'Person',
      name: 'News On Africa Founder',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'South Africa',
      addressLocality: 'Johannesburg',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+27-87-353-1295',
      email: 'info@newsonafrica.com',
    },
  };
}

// Generate NewsArticle schema for individual articles
export function getNewsArticleSchema({
  url,
  title,
  description,
  images = [],
  datePublished,
  dateModified,
  authorName,
  authorUrl,
  publisherName = 'News On Africa',
  publisherLogo = `${siteConfig.url}/logo.png`,
}: SchemaOrgProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: description,
    image: images,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: authorName
      ? {
          '@type': 'Person',
          name: authorName,
          url: authorUrl,
        }
      : undefined,
    publisher: {
      '@type': 'NewsMediaOrganization',
      '@id': `${siteConfig.url}/#organization`,
      name: publisherName,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogo,
        width: 600,
        height: 60,
      },
    },
    isAccessibleForFree: 'True',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

// Generate BreadcrumbList schema
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Generate WebSite schema
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: 'News On Africa',
    description: siteConfig.description,
    publisher: {
      '@id': `${siteConfig.url}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/search?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

// Generate WebPage schema
export function getWebPageSchema(url: string, title: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url: url,
    name: title,
    description: description,
    isPartOf: {
      '@id': `${siteConfig.url}/#website`,
    },
    inLanguage: 'en-US',
    about: {
      '@id': `${siteConfig.url}/#organization`,
    },
  };
}
