'use client';

import { SEO_CONFIG } from '@/lib/seo';

interface ServiceFeature {
  title: string;
  description: string;
  icon?: string;
}

interface ServiceStructuredDataProps {
  services?: ServiceFeature[];
}

export function ServiceStructuredData({ services = [] }: ServiceStructuredDataProps) {
  const defaultServices = [
    {
      title: 'Trade Analytics',
      description: 'Comprehensive analysis of your trading performance with real-time P&L tracking and detailed metrics.',
    },
    {
      title: 'Broker Integration',
      description: 'Seamless integration with 20+ brokers including Interactive Brokers, TD Ameritrade, and Charles Schwab.',
    },
    {
      title: 'Performance Reports',
      description: 'Professional trading reports with advanced analytics and insights to improve your strategy.',
    },
    {
      title: 'Risk Management',
      description: 'Advanced risk analysis tools to help you optimize position sizing and manage your portfolio risk.',
    },
  ];

  const servicesToUse = services.length > 0 ? services : defaultServices;

  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'Service',
    name: 'Trading Analytics Platform',
    description: SEO_CONFIG.siteDescription,
    provider: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.siteUrl,
      logo: `${SEO_CONFIG.siteUrl}/opengraph-image`,
    },
    serviceType: 'Financial Software',
    areaServed: 'Global',
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: SEO_CONFIG.siteUrl,
      availableLanguage: 'English',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Trading Analytics Services',
      itemListElement: servicesToUse.map((service, index) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.title,
          description: service.description,
        },
        position: index + 1,
      })),
    },
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
          name: 'Day Trader Pro',
        },
        reviewBody: 'Outstanding trading analytics platform. The broker integration is seamless and the performance tracking is exactly what I needed.',
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
        reviewBody: 'Professional-grade analytics with intuitive interface. Perfect for managing multiple trading strategies.',
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

export function LocalBusinessStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SEO_CONFIG.siteName,
    description: SEO_CONFIG.siteDescription,
    url: SEO_CONFIG.siteUrl,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    serviceType: 'Trading Analytics Software',
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
    potentialAction: {
      '@type': 'UseAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SEO_CONFIG.siteUrl}/demo`,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}