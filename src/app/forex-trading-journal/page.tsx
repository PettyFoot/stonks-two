import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, TrendingUp, BarChart3, FileText, Target, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Forex Trading Journal | Track Currency Pairs & FX Performance',
  description: 'Professional forex trading journal for tracking currency pairs, managing risk, and improving your FX trading performance. Track pips, win rate, and performance by currency pair. Try free demo →',
  keywords: 'forex trading journal, forex trade tracker, FX journal, currency trading journal, forex trading log, forex trade analysis, pip tracker',
  alternates: {
    canonical: 'https://tradevoyageranalytics.com/forex-trading-journal'
  },
  openGraph: {
    title: 'Forex Trading Journal | Track Currency Pairs & FX Performance',
    description: 'Professional forex trading journal for tracking currency pairs, managing risk, and improving your FX trading performance. Track pips, win rate, and performance by currency pair.',
    url: 'https://tradevoyageranalytics.com/forex-trading-journal',
    type: 'website',
    images: [{
      url: 'https://tradevoyageranalytics.com/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Forex Trading Journal - Trade Voyager Analytics'
    }]
  }
};

export default function ForexJournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-[#2b4140]">
              Trade Voyager Analytics
            </Link>
            <div className="flex gap-4">
              <Link href="/pricing"><Button variant="outline">Get Started</Button></Link>
              <Link href="/login"><Button className="bg-[#2b4140] hover:bg-[#1a2827]">Sign In</Button></Link>
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">Forex Trading Journal</h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Track every currency pair trade, analyze your FX performance, and become a consistently profitable forex trader
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="bg-[#2b4140] hover:bg-[#1a2827] text-lg px-8">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing"><Button size="lg" variant="outline" className="text-lg px-8">View Pricing</Button></Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">No credit card required • Full demo access</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built for Forex Traders</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Globe className="h-8 w-8 text-blue-600" />,
                title: 'Track All Currency Pairs',
                description: 'Log trades for majors, minors, and exotics. EUR/USD, GBP/JPY, USD/CAD, or any currency pair you trade.'
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-green-600" />,
                title: 'Pip Tracking & P&L',
                description: 'Automatically calculate pips gained/lost and P&L for each trade. See your true performance in real-time.'
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
                title: 'Performance by Pair',
                description: 'Identify which currency pairs are most profitable for you. Focus on your strengths.'
              },
              {
                icon: <FileText className="h-8 w-8 text-orange-600" />,
                title: 'Trade Notes & Setup',
                description: 'Document your technical analysis, support/resistance levels, and trading thesis for every FX trade.'
              },
              {
                icon: <Target className="h-8 w-8 text-red-600" />,
                title: 'Risk Management',
                description: 'Track risk/reward ratio, position sizing, and leverage for each trade. Manage your risk properly.'
              },
              {
                icon: <Calendar className="h-8 w-8 text-indigo-600" />,
                title: 'Session Analysis',
                description: 'Analyze performance by trading session: London, New York, Asian. Find your optimal trading hours.'
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

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Supports Major Forex Platforms</h2>
          <p className="text-xl text-gray-600 mb-8">Import trades from MT4, MT5, and other popular forex platforms</p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {['MetaTrader 4', 'MetaTrader 5', 'cTrader', 'NinjaTrader', 'Interactive Brokers', 'OANDA', 'Forex.com', 'IG'].map((platform) => (
              <div key={platform} className="px-6 py-3 bg-white border rounded-lg shadow-sm">
                <span className="font-medium text-gray-700">{platform}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600">Plus CSV import for any broker</p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Forex Trading Journal FAQ</h2>
          <div className="space-y-6">
            {[
              {
                question: 'What is a forex trading journal?',
                answer: 'A forex trading journal is a detailed log of all your currency pair trades including entry/exit prices, pip profit/loss, lot sizes, and your reasoning. It helps track performance and improve your FX trading over time.'
              },
              {
                question: 'Can I import from MetaTrader 4 and MT5?',
                answer: 'Yes! Trade Voyager supports CSV imports from MetaTrader 4, MetaTrader 5, cTrader, and other popular forex platforms. Simply export your trade history and upload it.'
              },
              {
                question: 'How do I track pips in my forex journal?',
                answer: 'Trade Voyager automatically calculates pips gained or lost for each currency pair trade based on your entry and exit prices. No manual calculation needed.'
              },
              {
                question: 'What forex metrics should I track?',
                answer: 'Track win rate, average pips per trade, profit factor, maximum drawdown, and performance by currency pair and trading session (London, New York, Asian).'
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

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#2b4140] to-[#1a2827] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Start Tracking Your Forex Trades Today</h2>
          <p className="text-xl mb-8 text-gray-200">Join forex traders improving their performance with Trade Voyager</p>
          <Link href="/pricing">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is a forex trading journal?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "A forex trading journal is a detailed log of all your currency pair trades including entry/exit prices, pip profit/loss, lot sizes, and your reasoning. It helps track performance and improve your FX trading over time."
                }
              },
              {
                "@type": "Question",
                "name": "Can I import from MetaTrader 4 and MT5?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Trade Voyager supports CSV imports from MetaTrader 4, MetaTrader 5, cTrader, and other popular forex platforms. Simply export your trade history and upload it."
                }
              }
            ]
          })
        }}
      />
    </div>
  );
}
