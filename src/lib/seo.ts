import { Metadata } from 'next';

// SEO Configuration Constants
export const SEO_CONFIG = {
  siteName: 'Trade Voyager Analytics',
  siteDescription: 'Professional trading analytics and performance tracking for serious traders. Track P&L, analyze performance, and improve your trading with comprehensive analytics.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradevoyageranalytics.com',
  twitterHandle: '@tradevoyager',
  defaultImage: '/og-image.png',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tradevoyageranalytics.com',
  keywords: {
    primary: ['trading analytics', 'trade tracking', 'P&L analysis', 'trading performance'],
    secondary: ['stock trading', 'forex trading', 'options trading', 'trading dashboard', 'broker integration', 'trading reports'],
    technical: ['Interactive Brokers', 'TD Ameritrade', 'trading platform', 'portfolio analysis', 'risk management']
  }
};

// Page-specific SEO configurations
export const PAGE_SEO = {
  home: {
    title: 'Trade Voyager Analytics | Professional Trading Platform',
    description: 'Track your trading performance like a pro. Real-time P&L analysis, win rates, broker integration with Interactive Brokers & TD Ameritrade. Start free demo →',
    keywords: ['trading analytics platform', 'professional trading tools', 'trading performance tracker', 'broker integration', 'P&L tracking'],
    path: '/'
  },
  login: {
    title: 'Sign In | Trade Voyager Analytics Dashboard Access',
    description: 'Access your trading analytics dashboard. View real-time P&L, analyze performance, and improve your trading results. Secure login for professional traders.',
    keywords: ['trading login', 'trading account', 'secure trading platform', 'trading dashboard access'],
    path: '/login'
  },
  dashboard: {
    title: 'Trading Dashboard | Real-Time Performance Analytics',
    description: 'Your complete trading performance overview. Real-time P&L, win rates, risk metrics, and detailed analytics. See exactly how profitable your trading is.',
    keywords: ['trading dashboard', 'real-time P&L', 'trading performance', 'win rate analysis', 'trading metrics'],
    path: '/dashboard'
  },
  trades: {
    title: 'Trade History & Analysis | Complete Trading Records',
    description: 'Analyze every trade you\'ve made. Advanced filtering, performance metrics, and insights to identify winning patterns and improve your trading strategy.',
    keywords: ['trade history', 'trade analysis', 'trading records', 'trade performance', 'trade management'],
    path: '/trades'
  },
  reports: {
    title: 'Trading Reports | Professional Performance Analytics',
    description: 'Generate professional trading reports with detailed analytics. Performance breakdowns, win/loss analysis, and actionable insights to boost profitability.',
    keywords: ['trading reports', 'performance analytics', 'trading statistics', 'win loss analysis', 'trading insights'],
    path: '/reports'
  },
  calendar: {
    title: 'Trading Calendar | Daily Performance & Patterns',
    description: 'Visualize your trading performance by date. Daily P&L tracking, trade patterns, and performance trends to optimize your trading schedule and timing.',
    keywords: ['trading calendar', 'daily trading performance', 'trading patterns', 'calendar view', 'daily P&L'],
    path: '/calendar'
  },
  records: {
    title: 'Trading Records | Organize & Manage Your Trades',
    description: 'Keep your trades organized with advanced filtering and categorization. Professional record keeping to track every detail and improve your strategy.',
    keywords: ['trading records', 'trade organization', 'trade management', 'record keeping', 'trade categorization'],
    path: '/records'
  },
  import: {
    title: 'Import Trades | Connect Interactive Brokers & More',
    description: 'Connect your broker in minutes. Import trades from Interactive Brokers, TD Ameritrade, Charles Schwab, and 20+ brokers. Easy CSV import included.',
    keywords: ['import trades', 'broker integration', 'CSV import', 'Interactive Brokers', 'TD Ameritrade', 'trade import'],
    path: '/import'
  },
  'new-trade': {
    title: 'Add New Trade | Manual Trade Entry & Logging',
    description: 'Log trades manually with complete details. Entry/exit prices, quantities, notes, and custom tags. Perfect for any broker or manual tracking.',
    keywords: ['add trade', 'manual trade entry', 'new trade', 'trade input', 'trade logging'],
    path: '/new-trade'
  },
  search: {
    title: 'Search Trades | Find Patterns & Analyze Performance',
    description: 'Powerful trade search with advanced filters. Find winning patterns, analyze by symbol, date, or strategy. Discover what makes you profitable.',
    keywords: ['search trades', 'trade search', 'find trades', 'trade patterns', 'trade filtering'],
    path: '/search'
  },
  demo: {
    title: 'Free Demo | Try Trade Voyager Analytics Risk-Free',
    description: 'Explore all features with sample trading data. No signup required. See real analytics, reports, and insights. Try it free before you commit →',
    keywords: ['trading demo', 'demo mode', 'free trial', 'trading platform demo', 'sample trading data'],
    path: '/demo'
  },
  contact: {
    title: 'Contact Support | Get Trading Analytics Help Fast',
    description: 'Need help with trading analytics or broker integration? Our expert team responds within 24 hours. Get support for imports, reports, and more.',
    keywords: ['contact support', 'trading analytics help', 'customer service', 'trading platform support', 'broker integration help', 'trading analytics contact'],
    path: '/contact'
  },
  features: {
    title: 'Features | Professional Trading Analytics Platform',
    description: 'Discover powerful trading analytics features: real-time P&L tracking, broker integration, advanced reports, risk analysis, and enterprise security.',
    keywords: ['trading platform features', 'trading analytics features', 'broker integration features', 'trading reports', 'risk analysis tools', 'trading security'],
    path: '/features'
  },
  pricing: {
    title: 'Pricing | Professional Trading Analytics Plans',
    description: 'Flexible trading analytics pricing. Free demo, professional plans from $19/month, and enterprise solutions. Start your free trial today →',
    keywords: ['trading analytics pricing', 'trading platform cost', 'professional trading tools price', 'trading subscription', 'trading analytics plans'],
    path: '/pricing'
  },
  about: {
    title: 'About Us | Trade Voyager Analytics Mission & Team',
    description: 'Learn about Trade Voyager Analytics: our mission to help traders succeed, our team of trading and technology experts, and our commitment to your success.',
    keywords: ['about trade voyager', 'trading analytics company', 'trading platform team', 'trading analytics mission', 'professional trading tools'],
    path: '/about'
  },
  privacy: {
    title: 'Privacy Policy | How We Protect Your Trading Data',
    description: 'Your trading data privacy is our priority. Learn how Trade Voyager Analytics protects, encrypts, and secures your sensitive trading information.',
    keywords: ['trading data privacy', 'data security', 'privacy policy', 'trading data protection', 'secure trading platform'],
    path: '/privacy'
  },
  terms: {
    title: 'Terms of Service | Trade Voyager Analytics Agreement',
    description: 'Read our terms of service for Trade Voyager Analytics. Clear, fair terms for using our professional trading analytics and performance tracking platform.',
    keywords: ['terms of service', 'trading platform terms', 'service agreement', 'trading analytics terms', 'user agreement'],
    path: '/terms'
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
        }
      };

    case 'breadcrumb':
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: (data?.items as any)?.map((item: Record<string, unknown>, index: number) => ({
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