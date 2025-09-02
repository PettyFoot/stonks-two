'use client';

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

interface HowToStructuredDataProps {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
  estimatedCost?: {
    currency: string;
    value: number;
  };
}

export function HowToStructuredData({ name, description, steps, totalTime, estimatedCost }: HowToStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTime && { totalTime }),
    ...(estimatedCost && {
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: estimatedCost.currency,
        value: estimatedCost.value
      }
    }),
    supply: [
      {
        '@type': 'HowToSupply',
        name: 'Computer with internet connection'
      },
      {
        '@type': 'HowToSupply',
        name: 'Trading account or CSV files'
      }
    ],
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url,
      image: step.image
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData, null, 2) }}
    />
  );
}

// Predefined HowTo guides for Trade Voyager Analytics
export const TRADING_HOWTO_GUIDES = {
  gettingStarted: {
    name: 'How to Get Started with Trade Voyager Analytics',
    description: 'Learn how to set up your trading analytics account and start tracking your performance in minutes.',
    totalTime: 'PT10M',
    estimatedCost: {
      currency: 'USD',
      value: 0
    },
    steps: [
      {
        name: 'Sign up for Trade Voyager Analytics',
        text: 'Create your free account by clicking the Get Started button and entering your email address. No credit card required for the demo.',
        url: '/login'
      },
      {
        name: 'Try the demo mode',
        text: 'Explore all features with sample trading data by clicking Try Demo. This lets you see exactly how the platform works.',
        url: '/demo'
      },
      {
        name: 'Import your trading data',
        text: 'Upload your trades from Interactive Brokers, TD Ameritrade, or any broker using CSV import. The system automatically categorizes your trades.',
        url: '/import'
      },
      {
        name: 'Review your analytics',
        text: 'Check your dashboard to see real-time P&L, win rates, and performance metrics. The platform calculates everything automatically.',
        url: '/dashboard'
      },
      {
        name: 'Generate reports',
        text: 'Create professional trading reports to track your progress over time and identify profitable patterns in your trading.',
        url: '/reports'
      }
    ]
  },
  
  importTrades: {
    name: 'How to Import Trades from Interactive Brokers',
    description: 'Step-by-step guide to importing your trading data from Interactive Brokers into Trade Voyager Analytics.',
    totalTime: 'PT5M',
    steps: [
      {
        name: 'Log into Interactive Brokers',
        text: 'Access your Interactive Brokers account and navigate to the Reports section in your account management.',
      },
      {
        name: 'Create a Flex Query',
        text: 'Create a new Flex Query for Trades, including fields like symbol, date/time, quantity, price, and commission.',
      },
      {
        name: 'Download CSV data',
        text: 'Run your Flex Query and download the results as a CSV file to your computer.',
      },
      {
        name: 'Upload to Trade Voyager Analytics',
        text: 'In Trade Voyager Analytics, go to Import Trades and select Interactive Brokers format, then upload your CSV file.',
        url: '/import'
      },
      {
        name: 'Review imported trades',
        text: 'Check that all trades imported correctly and review your updated analytics dashboard with your real trading data.',
        url: '/dashboard'
      }
    ]
  },
  
  optimizePerformance: {
    name: 'How to Optimize Your Trading Performance with Analytics',
    description: 'Use Trade Voyager Analytics to identify patterns and improve your trading results with data-driven insights.',
    totalTime: 'PT15M',
    steps: [
      {
        name: 'Analyze your win rate',
        text: 'Review your overall win rate and identify which symbols or strategies have the highest success rates.',
        url: '/reports'
      },
      {
        name: 'Study your profit factor',
        text: 'Check your profit factor (total wins divided by total losses) to understand the profitability of your trading strategy.',
        url: '/analytics'
      },
      {
        name: 'Review time-based patterns',
        text: 'Use the calendar view to identify which days or times you trade most successfully.',
        url: '/calendar'
      },
      {
        name: 'Identify your best setups',
        text: 'Filter your trades by different criteria to find your most profitable trading setups and patterns.',
        url: '/search'
      },
      {
        name: 'Set performance goals',
        text: 'Based on your analysis, set realistic monthly and quarterly trading goals and track your progress.',
        url: '/dashboard'
      }
    ]
  }
};

// Component for getting started guide
export function GettingStartedHowTo() {
  return <HowToStructuredData {...TRADING_HOWTO_GUIDES.gettingStarted} />;
}

// Component for import trades guide
export function ImportTradesHowTo() {
  return <HowToStructuredData {...TRADING_HOWTO_GUIDES.importTrades} />;
}

// Component for performance optimization guide
export function OptimizePerformanceHowTo() {
  return <HowToStructuredData {...TRADING_HOWTO_GUIDES.optimizePerformance} />;
}