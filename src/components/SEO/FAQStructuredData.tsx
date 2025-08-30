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

// Default FAQ data for Trade Voyager
export const TRADING_FAQS: FAQItem[] = [
  {
    question: "What is Trade Voyager?",
    answer: "Trade Voyager is a professional trading analytics platform that helps traders track their performance, analyze their P&L, and improve their trading strategies with comprehensive analytics and reporting tools."
  },
  {
    question: "Which brokers does Trade Voyager support?",
    answer: "Trade Voyager supports major brokers including Interactive Brokers, TD Ameritrade, and many others through CSV import functionality. You can easily import your trading data from any broker that provides CSV export."
  },
  {
    question: "Is my trading data secure?",
    answer: "Yes, Trade Voyager uses bank-level security with complete user data isolation. All data is encrypted in transit and at rest, and we never share your trading information with third parties."
  },
  {
    question: "Can I try Trade Voyager before signing up?",
    answer: "Yes! Trade Voyager offers a comprehensive demo mode where you can explore all features with sample trading data. No signup required - just click 'Try Demo' to get started."
  },
  {
    question: "What types of trading analytics does Trade Voyager provide?",
    answer: "Trade Voyager provides comprehensive analytics including P&L tracking, win rate analysis, risk metrics, performance by time periods, trading patterns, profit factor, drawdown analysis, and much more."
  }
];

export function TradingFAQStructuredData() {
  return <FAQStructuredData faqs={TRADING_FAQS} />;
}