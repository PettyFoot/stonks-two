import { Metadata } from 'next';

// SEO Configuration Constants
export const SEO_CONFIG = {
  siteName: 'Trade Voyager',
  siteDescription: 'Professional trading analytics and performance tracking for serious traders. Track P&L, analyze performance, and improve your trading with comprehensive analytics.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://tradevoyager.com',
  twitterHandle: '@tradevoyager',
  defaultImage: '/trade-voyager-logo.png',
  keywords: {
    primary: ['trading analytics', 'trade tracking', 'P&L analysis', 'trading performance'],
    secondary: ['stock trading', 'forex trading', 'options trading', 'trading dashboard', 'broker integration', 'trading reports'],
    technical: ['Interactive Brokers', 'TD Ameritrade', 'trading platform', 'portfolio analysis', 'risk management']
  }
};

// Page-specific SEO configurations
export const PAGE_SEO = {
  home: {
    title: 'Trade Voyager - Professional Trading Analytics Platform',
    description: 'Professional trading analytics and performance tracking for serious traders. Track P&L, analyze performance, and improve your trading with comprehensive analytics.',
    keywords: ['trading analytics platform', 'professional trading tools', 'trading performance tracker', 'broker integration', 'P&L tracking'],
    path: '/'
  },
  login: {
    title: 'Sign In - Trade Voyager | Professional Trading Analytics',
    description: 'Sign in to your Trade Voyager account and access professional trading analytics, performance tracking, and comprehensive reports.',
    keywords: ['trading login', 'trading account', 'secure trading platform', 'trading dashboard access'],
    path: '/login'
  },
  dashboard: {
    title: 'Trading Dashboard - Real-Time Performance Analytics | Trade Voyager',
    description: 'View your trading performance with real-time P&L tracking, win rates, risk metrics, and comprehensive analytics in your personalized trading dashboard.',
    keywords: ['trading dashboard', 'real-time P&L', 'trading performance', 'win rate analysis', 'trading metrics'],
    path: '/dashboard'
  },
  trades: {
    title: 'Trade History & Analysis - Track All Your Trades | Trade Voyager',
    description: 'View, analyze, and manage your complete trade history with detailed performance metrics, filtering options, and comprehensive trade analytics.',
    keywords: ['trade history', 'trade analysis', 'trading records', 'trade performance', 'trade management'],
    path: '/trades'
  },
  reports: {
    title: 'Trading Reports & Analytics - Detailed Performance Analysis | Trade Voyager',
    description: 'Generate comprehensive trading reports with detailed analytics, performance breakdowns, win/loss analysis, and actionable insights.',
    keywords: ['trading reports', 'performance analytics', 'trading statistics', 'win loss analysis', 'trading insights'],
    path: '/reports'
  },
  calendar: {
    title: 'Trading Calendar - Daily Performance Overview | Trade Voyager',
    description: 'View your trading performance organized by calendar view with daily P&L, trade counts, and performance patterns over time.',
    keywords: ['trading calendar', 'daily trading performance', 'trading patterns', 'calendar view', 'daily P&L'],
    path: '/calendar'
  },
  records: {
    title: 'Trading Records Management - Organize Your Trades | Trade Voyager',
    description: 'Manage and organize your trading records with advanced filtering, categorization, and detailed trade information management.',
    keywords: ['trading records', 'trade organization', 'trade management', 'record keeping', 'trade categorization'],
    path: '/records'
  },
  import: {
    title: 'Import Trades - Connect Your Broker | Trade Voyager',
    description: 'Import your trades from major brokers including Interactive Brokers, TD Ameritrade, and others. Easy CSV import and broker integration.',
    keywords: ['import trades', 'broker integration', 'CSV import', 'Interactive Brokers', 'TD Ameritrade', 'trade import'],
    path: '/import'
  },
  'new-trade': {
    title: 'Add New Trade - Manual Trade Entry | Trade Voyager',
    description: 'Manually add new trades to your portfolio with detailed information including entry/exit prices, quantities, and trade notes.',
    keywords: ['add trade', 'manual trade entry', 'new trade', 'trade input', 'trade logging'],
    path: '/new-trade'
  },
  search: {
    title: 'Search Trades - Find Specific Trades & Patterns | Trade Voyager',
    description: 'Search and filter through your trades to find specific patterns, symbols, dates, or performance criteria with advanced search tools.',
    keywords: ['search trades', 'trade search', 'find trades', 'trade patterns', 'trade filtering'],
    path: '/search'
  },
  demo: {
    title: 'Demo Mode - Try Trade Voyager Risk-Free | Trading Analytics Demo',
    description: 'Explore Trade Voyager\'s full feature set with sample trading data. No signup required - see exactly how our platform can improve your trading.',
    keywords: ['trading demo', 'demo mode', 'free trial', 'trading platform demo', 'sample trading data'],
    path: '/demo'
  }
};

// Utility function to generate metadata for a page
export function generateMetadata(pageKey: keyof typeof PAGE_SEO, customOptions?: {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const pageConfig = PAGE_SEO[pageKey];
  const title = customOptions?.title || pageConfig.title;
  const description = customOptions?.description || pageConfig.description;
  const keywords = customOptions?.keywords || pageConfig.keywords;
  const image = customOptions?.image || SEO_CONFIG.defaultImage;
  const canonical = `${SEO_CONFIG.siteUrl}${pageConfig.path}`;

  return {
    title,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: SEO_CONFIG.siteName }],
    creator: SEO_CONFIG.siteName,
    publisher: SEO_CONFIG.siteName,
    robots: customOptions?.noIndex ? 'noindex,nofollow' : 'index,follow',
    canonical,
    alternates: {
      canonical
    },
    openGraph: {
      type: 'website',
      siteName: SEO_CONFIG.siteName,
      title,
      description,
      url: canonical,
      images: [{
        url: `${SEO_CONFIG.siteUrl}${image}`,
        width: 1200,
        height: 630,
        alt: title
      }]
    },
    twitter: {
      card: 'summary_large_image',
      site: SEO_CONFIG.twitterHandle,
      creator: SEO_CONFIG.twitterHandle,
      title,
      description,
      images: [`${SEO_CONFIG.siteUrl}${image}`]
    },
    other: {
      'application-name': SEO_CONFIG.siteName,
      'apple-mobile-web-app-title': SEO_CONFIG.siteName,
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
      'msapplication-TileColor': '#2563eb',
      'theme-color': '#2563eb'
    }
  };
}

// Generate structured data for different page types
export function generateStructuredData(type: 'organization' | 'softwareApplication' | 'breadcrumb', data?: Record<string, unknown>) {
  const baseUrl = SEO_CONFIG.siteUrl;
  
  switch (type) {
    case 'organization':
      return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SEO_CONFIG.siteName,
        url: baseUrl,
        logo: `${baseUrl}/trade-voyager-logo.png`,
        description: SEO_CONFIG.siteDescription,
        sameAs: [
          // Add social media URLs when available
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          availableLanguage: 'English'
        }
      };

    case 'softwareApplication':
      return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: SEO_CONFIG.siteName,
        description: SEO_CONFIG.siteDescription,
        url: baseUrl,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock'
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '150',
          bestRating: '5',
          worstRating: '1'
        }
      };

    case 'breadcrumb':
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: data?.items?.map((item: Record<string, unknown>, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${baseUrl}${item.url}`
        })) || []
      };

    default:
      return null;
  }
}

// SEO-friendly URL slug generator
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

// Generate meta keywords from content
export function generateKeywords(content: string, additionalKeywords: string[] = []): string[] {
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
  
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  const wordCounts = words.reduce((acc: Record<string, number>, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});
  
  const keywordCandidates = Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
  
  return [...new Set([...additionalKeywords, ...keywordCandidates])];
}