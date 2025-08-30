'use client';

import Head from 'next/head';
import { SEO_CONFIG } from '@/lib/seo';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  noIndex?: boolean;
  additionalMeta?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
}

export function SEOHead({
  title,
  description,
  keywords = [],
  image = SEO_CONFIG.defaultImage,
  url,
  noIndex = false,
  additionalMeta = []
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SEO_CONFIG.siteName}` : SEO_CONFIG.siteName;
  const fullDescription = description || SEO_CONFIG.siteDescription;
  const fullImage = image.startsWith('http') ? image : `${SEO_CONFIG.siteUrl}${image}`;
  const fullUrl = url ? `${SEO_CONFIG.siteUrl}${url}` : SEO_CONFIG.siteUrl;
  const metaKeywords = keywords.length > 0 ? keywords.join(', ') : SEO_CONFIG.keywords.primary.join(', ');

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="author" content={SEO_CONFIG.siteName} />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SEO_CONFIG.siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SEO_CONFIG.twitterHandle} />
      <meta name="twitter:creator" content={SEO_CONFIG.twitterHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />

      {/* Application-specific Meta Tags */}
      <meta name="application-name" content={SEO_CONFIG.siteName} />
      <meta name="apple-mobile-web-app-title" content={SEO_CONFIG.siteName} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-TileColor" content="#2563eb" />
      <meta name="theme-color" content="#2563eb" />

      {/* Additional Meta Tags */}
      {additionalMeta.map((meta, index) => (
        <meta
          key={index}
          {...(meta.name ? { name: meta.name } : { property: meta.property })}
          content={meta.content}
        />
      ))}

      {/* Favicon and Touch Icons */}
      <link rel="icon" type="image/png" href="/trade-voyager-logo.png" />
      <link rel="apple-touch-icon" href="/trade-voyager-logo.png" />
      <link rel="shortcut icon" href="/trade-voyager-logo.png" />
    </Head>
  );
}