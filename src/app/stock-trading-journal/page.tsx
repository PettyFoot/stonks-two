import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, BarChart3, FileText, Target, Calendar, PieChart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Stock Trading Journal | Track & Analyze Your Stock Trades',
  description: 'Professional stock trading journal to track every trade, analyze performance, and improve your stock trading strategy. Real-time P&L tracking, advanced analytics, and broker integrations. Try free demo →',
  keywords: 'stock trading journal, stock trade tracker, equity trading journal, stock market journal, day trading journal stocks, stock trade analysis, stock trading log',
  alternates: {
    canonical: 'https://tradevoyageranalytics.com/stock-trading-journal'
  },
  openGraph: {
    title: 'Stock Trading Journal | Track & Analyze Your Stock Trades',
    description: 'Professional stock trading journal to track every trade, analyze performance, and improve your stock trading strategy. Real-time P&L tracking, advanced analytics, and broker integrations.',
    url: 'https://tradevoyageranalytics.com/stock-trading-journal',
    type: 'website',
    images: [{
      url: 'https://tradevoyageranalytics.com/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Stock Trading Journal - Trade Voyager Analytics'
    }]
  }
};

export default function StockTradingJournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-[#2b4140]">
              Trade Voyager Analytics
            </Link>
            <div className="flex gap-4">
              <Link href="/demo">
                <Button variant="outline">Try Demo</Button>
              </Link>
              <Link href="/login">
                <Button className="bg-[#2b4140] hover:bg-[#1a2827]">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Stock Trading Journal
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Track every stock trade, analyze your performance, and become a consistently profitable stock trader
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo">
                <Button size="lg" className="bg-[#2b4140] hover:bg-[#1a2827] text-lg px-8">
                  Try Free Demo <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">No credit card required • Full demo access</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need for Stock Trading</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp className="h-8 w-8 text-green-600" />,
                title: 'Real-Time P&L Tracking',
                description: 'Track profits and losses on every stock trade in real-time. See exactly how much you\'re making or losing instantly.'
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
                title: 'Advanced Stock Analytics',
                description: 'Analyze your stock trading performance by sector, market cap, holding period, and more. Identify winning patterns.'
              },
              {
                icon: <FileText className="h-8 w-8 text-purple-600" />,
                title: 'Detailed Trade Notes',
                description: 'Document your thesis, entry/exit reasons, and emotions for each stock trade. Review what works and what doesn\'t.'
              },
              {
                icon: <Target className="h-8 w-8 text-red-600" />,
                title: 'Win Rate Analysis',
                description: 'Track your win rate, average winner vs loser, and profit factor across all your stock trades.'
              },
              {
                icon: <Calendar className="h-8 w-8 text-orange-600" />,
                title: 'Trading Calendar',
                description: 'Visualize your stock trading performance by day, week, and month. Identify your best and worst trading days.'
              },
              {
                icon: <PieChart className="h-8 w-8 text-indigo-600" />,
                title: 'Sector & Industry Breakdown',
                description: 'See which stock sectors and industries are most profitable for your trading style.'
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Broker Integration */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Automatic Import from Your Stock Broker</h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect your broker and import all your stock trades automatically. No manual entry required.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {['Interactive Brokers', 'TD Ameritrade', 'E*TRADE', 'Charles Schwab', 'Fidelity', 'Robinhood', 'Webull', 'Tastytrade'].map((broker) => (
              <div key={broker} className="px-6 py-3 bg-white border rounded-lg shadow-sm">
                <span className="font-medium text-gray-700">{broker}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600">Plus CSV import for any broker</p>
        </div>
      </section>

      {/* FAQ Schema */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Stock Trading Journal FAQ</h2>
          <div className="space-y-6">
            {[
              {
                question: 'What is a stock trading journal?',
                answer: 'A stock trading journal is a detailed log of all your stock trades including entry/exit prices, position sizes, reasons for the trade, and outcomes. It helps you track performance and improve your trading strategy over time.'
              },
              {
                question: 'Why should I keep a stock trading journal?',
                answer: 'A trading journal helps you identify patterns in your winning and losing trades, track your progress, maintain discipline, and learn from mistakes. Professional traders consider journaling essential for long-term success.'
              },
              {
                question: 'How do I start a stock trading journal?',
                answer: 'Start by logging every trade you make with Trade Voyager. Record the stock symbol, entry/exit prices, position size, your thesis, and the outcome. Over time, review your journal to identify what strategies work best for you.'
              },
              {
                question: 'Can I import my stock trades automatically?',
                answer: 'Yes! Trade Voyager connects with Interactive Brokers, TD Ameritrade, E*TRADE, Charles Schwab, and other major stock brokers to automatically import your trades. You can also upload CSV files from any broker.'
              },
              {
                question: 'What metrics should I track for stock trading?',
                answer: 'Track your win rate, profit factor, average winner vs average loser, maximum drawdown, and return on capital. Also track performance by sector, market cap, and holding period to identify your edge.'
              }
            ].map((faq, i) => (
              <div key={i} className="border-b pb-6">
                <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#2b4140] to-[#1a2827] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Start Tracking Your Stock Trades Today</h2>
          <p className="text-xl mb-8 text-gray-200">
            Join thousands of stock traders improving their performance with Trade Voyager Analytics
          </p>
          <Link href="/demo">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Try Free Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto text-center text-gray-600">
          <p>&copy; 2025 Trade Voyager Analytics. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <Link href="/contact" className="hover:text-gray-900">Contact</Link>
          </div>
        </div>
      </footer>

      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is a stock trading journal?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "A stock trading journal is a detailed log of all your stock trades including entry/exit prices, position sizes, reasons for the trade, and outcomes. It helps you track performance and improve your trading strategy over time."
                }
              },
              {
                "@type": "Question",
                "name": "Why should I keep a stock trading journal?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "A trading journal helps you identify patterns in your winning and losing trades, track your progress, maintain discipline, and learn from mistakes. Professional traders consider journaling essential for long-term success."
                }
              },
              {
                "@type": "Question",
                "name": "How do I start a stock trading journal?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Start by logging every trade you make with Trade Voyager. Record the stock symbol, entry/exit prices, position size, your thesis, and the outcome. Over time, review your journal to identify what strategies work best for you."
                }
              },
              {
                "@type": "Question",
                "name": "Can I import my stock trades automatically?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Trade Voyager connects with Interactive Brokers, TD Ameritrade, E*TRADE, Charles Schwab, and other major stock brokers to automatically import your trades. You can also upload CSV files from any broker."
                }
              },
              {
                "@type": "Question",
                "name": "What metrics should I track for stock trading?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Track your win rate, profit factor, average winner vs average loser, maximum drawdown, and return on capital. Also track performance by sector, market cap, and holding period to identify your edge."
                }
              }
            ]
          })
        }}
      />
    </div>
  );
}
