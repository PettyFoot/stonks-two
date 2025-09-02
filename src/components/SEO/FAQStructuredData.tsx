'use client';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQStructuredDataProps {
  faqs: FAQItem[];
}

export function FAQStructuredData({ faqs }: FAQStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData, null, 2) }}
    />
  );
}

// Comprehensive FAQ data for Trade Voyager Analytics - 25+ questions for better SEO coverage
export const TRADING_FAQS: FAQItem[] = [
  // Platform Overview
  {
    question: "What is Trade Voyager Analytics?",
    answer: "Trade Voyager Analytics is a professional trading analytics platform that helps traders track their performance, analyze their P&L, and improve their trading strategies with comprehensive analytics and reporting tools."
  },
  {
    question: "How does Trade Voyager Analytics work?",
    answer: "Trade Voyager Analytics imports your trading data from brokers or CSV files, analyzes your performance with advanced metrics, and provides detailed reports to help you identify profitable patterns and improve your trading results."
  },
  
  // Broker Integration & Data Import
  {
    question: "Which brokers does Trade Voyager Analytics support?",
    answer: "Trade Voyager Analytics supports major brokers including Interactive Brokers, TD Ameritrade, Charles Schwab, E*TRADE, and many others through CSV import functionality. You can easily import your trading data from any broker that provides CSV export."
  },
  {
    question: "How do I import trades from Interactive Brokers?",
    answer: "To import from Interactive Brokers, log into your IB account, go to Reports > Flex Queries, download your trade data as CSV, then upload it to Trade Voyager Analytics using our CSV import tool with the Interactive Brokers format preset."
  },
  {
    question: "Can I import trades from TD Ameritrade?",
    answer: "Yes, TD Ameritrade trades can be imported by downloading your transaction history from the TD Ameritrade website as a CSV file, then uploading it to Trade Voyager Analytics using our TD Ameritrade format preset."
  },
  {
    question: "How do I import trades from Charles Schwab?",
    answer: "To import Charles Schwab trades, export your transaction history from Schwab's website, then use our CSV import tool with the appropriate format mapping to upload your trade data."
  },
  {
    question: "What if my broker isn't directly supported?",
    answer: "If your broker isn't directly supported, you can still import your data using our flexible CSV import tool. Most brokers provide transaction export functionality - simply map the columns to match our format during import."
  },
  
  // Security & Privacy
  {
    question: "Is my trading data secure?",
    answer: "Yes, Trade Voyager Analytics uses bank-level security with complete user data isolation. All data is encrypted in transit and at rest, and we never share your trading information with third parties."
  },
  {
    question: "Who can see my trading data?",
    answer: "Only you can see your trading data. Trade Voyager Analytics implements complete user data isolation, meaning your trading information is never mixed with other users' data and is only accessible to you."
  },
  {
    question: "Do you sell or share trading data?",
    answer: "Never. We never sell, share, or monetize your trading data in any way. Your trading information remains completely private and is used solely to provide you with analytics and insights."
  },
  
  // Features & Analytics
  {
    question: "What types of trading analytics does Trade Voyager Analytics provide?",
    answer: "Trade Voyager Analytics provides comprehensive analytics including P&L tracking, win rate analysis, risk metrics, performance by time periods, trading patterns, profit factor, drawdown analysis, Sharpe ratio, and much more."
  },
  {
    question: "Can I track my trading performance over time?",
    answer: "Yes, Trade Voyager Analytics provides detailed performance tracking with historical charts, monthly/quarterly reports, performance trends, and calendar views to help you monitor your trading progress over time."
  },
  {
    question: "Does Trade Voyager Analytics show win rate and profit factor?",
    answer: "Yes, we calculate and display your win rate, profit factor, average win/loss, largest wins/losses, and many other key performance metrics that professional traders use to evaluate their strategies."
  },
  {
    question: "Can I analyze my trading by symbols or strategies?",
    answer: "Absolutely. Trade Voyager Analytics allows you to filter and analyze your performance by specific symbols, trading strategies, time periods, or any custom criteria you define."
  },
  {
    question: "What is the difference between realized and unrealized P&L?",
    answer: "Realized P&L shows profits/losses from closed positions, while unrealized P&L shows potential gains/losses from open positions. Trade Voyager Analytics tracks both to give you a complete picture of your portfolio performance."
  },
  
  // Pricing & Plans
  {
    question: "Can I try Trade Voyager Analytics before signing up?",
    answer: "Yes! Trade Voyager Analytics offers a comprehensive demo mode where you can explore all features with sample trading data. No signup required - just click 'Try Demo' to get started."
  },
  {
    question: "How much does Trade Voyager Analytics cost?",
    answer: "Trade Voyager Analytics offers flexible pricing starting with a free demo, professional plans for individual traders, and enterprise solutions for trading firms. Visit our pricing page for current rates and features."
  },
  {
    question: "Is there a free trial available?",
    answer: "Yes, we offer a 14-day free trial of our professional features. You can also use our demo mode indefinitely with sample data to explore the platform's capabilities."
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your Trade Voyager Analytics subscription at any time from your account settings. Your data remains accessible until the end of your billing period, and you can export your data anytime."
  },
  
  // Technical Support
  {
    question: "What file formats can I import?",
    answer: "Trade Voyager Analytics supports CSV file imports from all major brokers. We also provide format presets for Interactive Brokers, TD Ameritrade, Charles Schwab, E*TRADE, and many others to make importing quick and easy."
  },
  {
    question: "How do I get help with importing my trades?",
    answer: "Our support team provides detailed import guides and can help you configure your CSV imports. Contact us through the platform, and we'll guide you through the process for your specific broker."
  },
  {
    question: "Can I export my data from Trade Voyager Analytics?",
    answer: "Yes, you can export your trading data and analytics reports at any time in multiple formats including CSV, PDF, and Excel. You maintain full control and ownership of your data."
  },
  {
    question: "Do you provide customer support?",
    answer: "Yes, we provide comprehensive customer support including email support, detailed documentation, video tutorials, and live chat for premium users. Most questions are answered within 24 hours."
  },
  
  // Advanced Features
  {
    question: "Can I create custom trading reports?",
    answer: "Yes, Trade Voyager Analytics allows you to create custom reports with your preferred metrics, date ranges, and formatting. You can save report templates and generate them regularly for consistent analysis."
  },
  {
    question: "Does Trade Voyager Analytics work for day trading?",
    answer: "Absolutely. Trade Voyager Analytics is perfect for day traders, providing detailed intraday analytics, pattern recognition, and performance tracking that day traders need to refine their strategies."
  },
  {
    question: "Can I track options trading with Trade Voyager Analytics?",
    answer: "Yes, Trade Voyager Analytics fully supports options trading analysis including options strategies, Greeks analysis, expiration tracking, and specialized options performance metrics."
  },
  {
    question: "Is Trade Voyager Analytics suitable for forex trading?",
    answer: "Yes, forex traders can use Trade Voyager Analytics to track currency pair performance, analyze pip gains/losses, monitor drawdown, and optimize their forex trading strategies with comprehensive analytics."
  },
  {
    question: "Can I use Trade Voyager Analytics for cryptocurrency trading?",
    answer: "Yes, Trade Voyager Analytics supports cryptocurrency trading analysis. You can import your crypto trades from exchanges and analyze your performance across different coins, trading pairs, and strategies."
  }
];

export function TradingFAQStructuredData() {
  return <FAQStructuredData faqs={TRADING_FAQS} />;
}