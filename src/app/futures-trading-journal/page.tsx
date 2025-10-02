import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, TrendingUp, BarChart3, FileText, Target, Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Futures Trading Journal | Track E-Mini, Commodities & Index Futures',
  description: 'Professional futures trading journal for E-mini S&P, crude oil, gold, and all futures contracts. Track performance, manage risk, and improve your futures trading. Try free demo →',
  keywords: 'futures trading journal, futures trade tracker, e-mini journal, commodities trading journal, futures trading log, futures trade analysis',
  alternates: {
    canonical: 'https://tradevoyageranalytics.com/futures-trading-journal'
  },
  openGraph: {
    title: 'Futures Trading Journal | Track E-Mini, Commodities & Index Futures',
    description: 'Professional futures trading journal for E-mini S&P, crude oil, gold, and all futures contracts. Track performance, manage risk, and improve your futures trading.',
    url: 'https://tradevoyageranalytics.com/futures-trading-journal',
    type: 'website',
    images: [{
      url: 'https://tradevoyageranalytics.com/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Futures Trading Journal - Trade Voyager Analytics'
    }]
  }
};

export default function FuturesJournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-[#2b4140]">Trade Voyager Analytics</Link>
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
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">Futures Trading Journal</h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Track E-mini, commodities, and index futures. Master futures trading with professional analytics and risk management.
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
          <h2 className="text-3xl font-bold text-center mb-12">Built for Futures Traders</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-8 w-8 text-yellow-600" />,
                title: 'All Futures Contracts',
                description: 'Track E-mini S&P, Nasdaq, crude oil, gold, natural gas, and any futures contract you trade.'
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-green-600" />,
                title: 'Tick & Point Tracking',
                description: 'Automatically calculate ticks/points gained and P&L for each futures trade. See true performance.'
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
                title: 'Performance by Contract',
                description: 'Identify which futures contracts are most profitable. ES vs NQ vs CL—see what works for you.'
              },
              {
                icon: <FileText className="h-8 w-8 text-purple-600" />,
                title: 'Detailed Trade Notes',
                description: 'Document your setup, technical analysis, and market context for every futures trade.'
              },
              {
                icon: <Target className="h-8 w-8 text-red-600" />,
                title: 'Risk Management',
                description: 'Track contracts traded, margin requirements, and risk per trade. Manage leverage wisely.'
              },
              {
                icon: <Activity className="h-8 w-8 text-indigo-600" />,
                title: 'Session Analysis',
                description: 'Analyze performance by market session: pre-market, regular hours, overnight. Find your edge.'
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
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6">Popular Futures Contracts Supported</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'E-mini S&P 500 (ES)',
              'E-mini Nasdaq (NQ)',
              'E-mini Dow (YM)',
              'Crude Oil (CL)',
              'Natural Gas (NG)',
              'Gold (GC)',
              'Silver (SI)',
              'Euro FX (6E)',
              '10-Year Treasury (ZN)',
              'Corn (ZC)',
              'Soybeans (ZS)',
              'Bitcoin Futures (BTC)'
            ].map((contract) => (
              <div key={contract} className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="font-medium">{contract}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Supports Major Futures Platforms</h2>
          <p className="text-xl text-gray-600 mb-8">Import futures trades from popular platforms</p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {['NinjaTrader', 'TradeStation', 'Interactive Brokers', 'TD Ameritrade', 'E*TRADE', 'Thinkorswim', 'Sierra Chart', 'AMP Futures'].map((platform) => (
              <div key={platform} className="px-6 py-3 bg-white border rounded-lg shadow-sm">
                <span className="font-medium text-gray-700">{platform}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600">Plus CSV import for any broker</p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Futures Trading Journal FAQ</h2>
          <div className="space-y-6">
            {[
              {
                question: 'What is a futures trading journal?',
                answer: 'A futures trading journal is a detailed record of all your futures trades including E-mini contracts, commodities, and indices. It tracks entry/exit prices, ticks/points, P&L, and your trading decisions to improve performance.'
              },
              {
                question: 'Can I track E-mini futures trades?',
                answer: 'Yes! Trade Voyager fully supports E-mini S&P (ES), E-mini Nasdaq (NQ), E-mini Dow (YM), and all major index futures. Track ticks, points, and P&L automatically.'
              },
              {
                question: 'How do I import futures trades?',
                answer: 'Import trades from NinjaTrader, TradeStation, Interactive Brokers, and other platforms. Simply export your trade history as CSV and upload to Trade Voyager.'
              },
              {
                question: 'What futures trading metrics should I track?',
                answer: 'Track win rate, average ticks per trade, profit factor, maximum drawdown, and performance by contract type (index futures vs commodities) and trading session.'
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
          <h2 className="text-4xl font-bold mb-6">Start Tracking Your Futures Trades</h2>
          <p className="text-xl mb-8 text-gray-200">Join futures traders improving performance with Trade Voyager</p>
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is a futures trading journal?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "A futures trading journal is a detailed record of all your futures trades including E-mini contracts, commodities, and indices. It tracks entry/exit prices, ticks/points, P&L, and your trading decisions to improve performance."
              }
            }
          ]
        })
      }} />
    </div>
  );
}
