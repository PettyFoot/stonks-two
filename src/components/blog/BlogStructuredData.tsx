import React from 'react';

interface BlogPostStructuredDataProps {
  post: {
    title: string;
    excerpt?: string | null;
    coverImage?: string | null;
    publishedAt: Date | string | null;
    updatedAt: Date | string;
    author: string;
    slug: string;
  };
  siteUrl: string;
}

export function BlogPostStructuredData({ post, siteUrl }: BlogPostStructuredDataProps) {
  const publishedDate = post.publishedAt ? (typeof post.publishedAt === 'string' ? post.publishedAt : post.publishedAt.toISOString()) : new Date().toISOString();
  const modifiedDate = typeof post.updatedAt === 'string' ? post.updatedAt : post.updatedAt.toISOString();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    image: post.coverImage ? `${siteUrl}${post.coverImage}` : undefined,
    datePublished: publishedDate,
    dateModified: modifiedDate,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Trade Voyager Analytics',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/trade-voyager-logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}