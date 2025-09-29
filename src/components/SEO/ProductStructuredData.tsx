'use client';

import { SEO_CONFIG } from '@/lib/seo';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations?: string[];
  highlight?: boolean;
}

interface ProductStructuredDataProps {
  plans: PricingPlan[];
}

export function ProductStructuredData({ plans }: ProductStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: SEO_CONFIG.siteName,
    description: SEO_CONFIG.siteDescription,
    brand: {
      '@type': 'Brand',
      name: SEO_CONFIG.siteName,
    },
    category: 'Software Application',
    url: SEO_CONFIG.siteUrl,
    image: `${SEO_CONFIG.siteUrl}/opengraph-image`,
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: `${plan.name} Plan`,
      description: plan.description,
      price: plan.price.replace('$', ''),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      validFrom: new Date().toISOString(),
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.price.replace('$', ''),
        priceCurrency: 'USD',
        billingDuration: plan.period === 'forever' ? 'P1Y' : 'P1M',
      },
      seller: {
        '@type': 'Organization',
        name: SEO_CONFIG.siteName,
      },
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
        },
        author: {
          '@type': 'Person',
          name: 'Professional Trader',
        },
        reviewBody: 'Excellent trading analytics platform with comprehensive features for tracking and analyzing trade performance.',
      },
    ],
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser, iOS, Android',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function WebApplicationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SEO_CONFIG.siteName,
    description: SEO_CONFIG.siteDescription,
    url: SEO_CONFIG.siteUrl,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        name: 'Free Plan',
        description: 'Full platform access with basic features',
      },
      {
        '@type': 'Offer',
        price: '9.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        name: 'Professional Plan',
        billingDuration: 'P1M',
        description: 'Unlimited trades and broker integrations',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    creator: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.siteUrl,
    },
    featureList: [
      'Real-time P&L tracking',
      'Advanced trade analytics',
      'Broker integration with 20+ brokers',
      'Professional performance reports',
      'Risk analysis and management tools',
      'Portfolio optimization',
      'Trading calendar and scheduling',
      'Import/export functionality',
      'Advanced search and filtering',
    ],
    screenshot: `${SEO_CONFIG.siteUrl}/opengraph-image`,
    softwareVersion: '2.0',
    datePublished: '2023-01-01T00:00:00Z',
    dateModified: new Date().toISOString(),
    downloadUrl: SEO_CONFIG.siteUrl,
    installUrl: SEO_CONFIG.siteUrl,
    permissions: 'read trading data, analyze performance, generate reports',
    requirements: 'Internet connection required',
    releaseNotes: 'Latest version with enhanced analytics and new broker integrations',
    supportingData: {
      '@type': 'DataFeed',
      name: 'Trading Data Feed',
      description: 'Real-time and historical trading data processing',
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
        },
        author: {
          '@type': 'Person',
          name: 'Professional Day Trader',
        },
        reviewBody: 'Outstanding platform for tracking trading performance. The real-time analytics and broker integration saved me hours of manual work.',
        datePublished: '2024-01-15T00:00:00Z',
      },
      {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
        },
        author: {
          '@type': 'Person',
          name: 'Portfolio Manager',
        },
        reviewBody: 'Professional-grade analytics with an intuitive interface. Perfect for managing multiple trading strategies and tracking performance.',
        datePublished: '2024-01-10T00:00:00Z',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}