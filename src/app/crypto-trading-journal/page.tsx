import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bitcoin, TrendingUp, BarChart3, FileText, Target, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Crypto Trading Journal | Track Bitcoin, Ethereum & Altcoin Trades',
  description: 'Professional cryptocurrency trading journal for Bitcoin, Ethereum, and altcoins. Track trades across exchanges, analyze performance, and improve your crypto trading. Try free demo →',
  keywords: 'crypto trading journal, cryptocurrency trading journal, bitcoin trading journal, ethereum trading journal, altcoin trade tracker, crypto trade log',
  alternates: {
    canonical: 'https://tradevoyageranalytics.com/crypto-trading-journal'
  },
  openGraph: {
    title: 'Crypto Trading Journal | Track Bitcoin, Ethereum & Altcoin Trades',
    description: 'Professional cryptocurrency trading journal for Bitcoin, Ethereum, and altcoins. Track trades across exchanges, analyze performance, and improve your crypto trading.',
    url: 'https://tradevoyageranalytics.com/crypto-trading-journal',
    type: 'website',
    images: [{
      url: 'https://tradevoyageranalytics.com/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Crypto Trading Journal - Trade Voyager Analytics'
    }]
  }
};

export default function CryptoJournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-[#2b4140]">Trade Voyager Analytics</Link>
            <div className="flex gap-4">
              <Link href="/demo"><Button variant="outline">Try Demo</Button></Link>
              <Link href="/login"><Button className="bg-[#2b4140] hover:bg-[#1a2827]">Sign In</Button></Link>
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">Crypto Trading Journal</h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Track Bitcoin, Ethereum, altcoins, and DeFi trades. Master crypto trading with professional analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo">
                <Button size="lg" className="bg-[#2b4140] hover:bg-[#1a2827] text-lg px-8">
                  Try Free Demo <ArrowRight className="ml-2 h-5 w-5" />
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
          <h2 className="text-3xl font-bold text-center mb-12">Built for Cryptocurrency Traders</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Bitcoin className="h-8 w-8 text-orange-500" />,
                title: 'Track All Cryptocurrencies',
                description: 'Log trades for Bitcoin, Ethereum, altcoins, and DeFi tokens. Track every crypto asset you trade.'
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-green-600" />,
                title: 'Multi-Exchange Support',
                description: 'Track trades across Coinbase, Binance, Kraken, and other exchanges in one unified journal.'
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
                title: 'Performance by Coin',
                description: 'See which cryptocurrencies are most profitable. BTC vs ETH vs altcoins—the data shows all.'
              },
              {
                icon: <FileText className="h-8 w-8 text-purple-600" />,
                title: 'Trade Notes & Analysis',
                description: 'Document your fundamental and technical analysis for each crypto trade. Track what works.'
              },
              {
                icon: <Target className="h-8 w-8 text-red-600" />,
                title: 'Risk Management',
                description: 'Track position sizing, stop losses, and risk/reward. Manage volatility in crypto markets.'
              },
              {
                icon: <Clock className="h-8 w-8 text-indigo-600" />,
                title: '24/7 Market Tracking',
                description: 'Crypto never sleeps. Track trades any time of day and analyze performance by hour/day/week.'
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
          <h2 className="text-3xl font-bold mb-6">Supports Major Crypto Exchanges</h2>
          <p className="text-xl text-gray-600 mb-8">Import trades from popular cryptocurrency exchanges</p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {['Coinbase', 'Binance', 'Kraken', 'Gemini', 'KuCoin', 'Bybit', 'OKX', 'Bitfinex'].map((exchange) => (
              <div key={exchange} className="px-6 py-3 bg-white border rounded-lg shadow-sm">
                <span className="font-medium text-gray-700">{exchange}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600">Plus CSV import for any exchange</p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Crypto Trading Journal FAQ</h2>
          <div className="space-y-6">
            {[
              {
                question: 'What is a crypto trading journal?',
                answer: 'A crypto trading journal is a comprehensive log of all your cryptocurrency trades including Bitcoin, Ethereum, and altcoins. It tracks entry/exit prices, P&L, and trading decisions to help improve your crypto trading performance.'
              },
              {
                question: 'Can I track trades from multiple exchanges?',
                answer: 'Yes! Trade Voyager lets you import and track trades from Coinbase, Binance, Kraken, and other exchanges all in one place. Get a unified view of all your crypto trading activity.'
              },
              {
                question: 'How do I import cryptocurrency trades?',
                answer: 'Export your trade history from your crypto exchange as a CSV file and upload it to Trade Voyager. We support all major exchanges including Coinbase, Binance, Kraken, and more.'
              },
              {
                question: 'What crypto trading metrics should I track?',
                answer: 'Track win rate, profit factor, average gain per trade, maximum drawdown, and performance by cryptocurrency (BTC, ETH, altcoins). Also analyze by trade duration and market conditions.'
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
          <h2 className="text-4xl font-bold mb-6">Start Tracking Your Crypto Trades</h2>
          <p className="text-xl mb-8 text-gray-200">Join crypto traders mastering the market with Trade Voyager</p>
          <Link href="/demo">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Try Free Demo <ArrowRight className="ml-2 h-5 w-5" />
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
              "name": "What is a crypto trading journal?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "A crypto trading journal is a comprehensive log of all your cryptocurrency trades including Bitcoin, Ethereum, and altcoins. It tracks entry/exit prices, P&L, and trading decisions to help improve your crypto trading performance."
              }
            }
          ]
        })
      }} />
    </div>
  );
}
