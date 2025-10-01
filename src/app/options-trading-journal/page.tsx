import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, BarChart3, FileText, Target, Calendar, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Options Trading Journal | Track Calls, Puts & Spreads',
  description: 'Professional options trading journal for tracking calls, puts, spreads, and complex strategies. Calculate Greeks, track P&L, and improve your options trading performance. Try free demo →',
  keywords: 'options trading journal, options trade tracker, call and put tracker, options spreads journal, options trading log, options trade analysis, iron condor tracker',
  alternates: {
    canonical: 'https://tradevoyageranalytics.com/options-trading-journal'
  },
  openGraph: {
    title: 'Options Trading Journal | Track Calls, Puts & Spreads',
    description: 'Professional options trading journal for tracking calls, puts, spreads, and complex strategies. Calculate Greeks, track P&L, and improve your options trading performance.',
    url: 'https://tradevoyageranalytics.com/options-trading-journal',
    type: 'website',
    images: [{
      url: 'https://tradevoyageranalytics.com/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Options Trading Journal - Trade Voyager Analytics'
    }]
  }
};

export default function OptionsJournalPage() {
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

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Options Trading Journal
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Track calls, puts, spreads, and complex options strategies. Master options trading with detailed analytics.
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

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Built Specifically for Options Traders</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-8 w-8 text-yellow-600" />,
                title: 'Track All Strategy Types',
                description: 'Log calls, puts, vertical spreads, iron condors, butterflies, straddles, and any complex multi-leg options strategy.'
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-green-600" />,
                title: 'Greeks & Risk Metrics',
                description: 'Monitor Delta, Gamma, Theta, and Vega for each position. Understand your risk exposure at all times.'
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
                title: 'Multi-Leg Position Tracking',
                description: 'Track complex multi-leg spreads as a single position. See total P&L across all legs automatically.'
              },
              {
                icon: <FileText className="h-8 w-8 text-purple-600" />,
                title: 'Detailed Trade Notes',
                description: 'Document your thesis, setup, technical analysis, and lessons learned for every options trade.'
              },
              {
                icon: <Target className="h-8 w-8 text-red-600" />,
                title: 'Win Rate by Strategy',
                description: 'See which options strategies work best for you. Iron condors vs vertical spreads? The data doesn\'t lie.'
              },
              {
                icon: <Calendar className="h-8 w-8 text-orange-600" />,
                title: 'Expiration Tracking',
                description: 'Track options by expiration date. Analyze performance by DTE (days to expiration) and holding period.'
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

      {/* Strategies Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6">Supports Every Options Strategy</h2>
          <p className="text-center text-gray-600 mb-12">Whether you trade simple calls and puts or complex multi-leg spreads</p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Long Calls & Puts',
              'Short Calls & Puts',
              'Vertical Spreads (Bull/Bear)',
              'Iron Condors',
              'Butterflies & Iron Butterflies',
              'Calendar Spreads',
              'Diagonal Spreads',
              'Straddles & Strangles',
              'Credit Spreads',
              'Debit Spreads',
              'Ratio Spreads',
              'Covered Calls'
            ].map((strategy) => (
              <div key={strategy} className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="font-medium">{strategy}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Broker Integration */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Auto-Import from Your Options Broker</h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect your broker and import all your options trades automatically—multi-leg spreads included.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {['Tastytrade', 'Interactive Brokers', 'TD Ameritrade', 'E*TRADE', 'Charles Schwab', 'Fidelity', 'Robinhood', 'Webull'].map((broker) => (
              <div key={broker} className="px-6 py-3 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                <span className="font-medium text-gray-700">{broker}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600">Plus CSV import for any broker</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Options Trading Journal FAQ</h2>
          <div className="space-y-6">
            {[
              {
                question: 'What is an options trading journal?',
                answer: 'An options trading journal is a detailed record of all your options trades including calls, puts, and multi-leg spreads. It tracks entry/exit prices, Greeks, P&L, and your reasoning for each trade to help improve your options trading performance.'
              },
              {
                question: 'Can I track multi-leg options strategies?',
                answer: 'Yes! Trade Voyager automatically groups multi-leg options strategies like iron condors, butterflies, and vertical spreads as single positions. You can see the total P&L and Greeks across all legs.'
              },
              {
                question: 'How do I import options trades?',
                answer: 'Connect your broker (Tastytrade, Interactive Brokers, TD Ameritrade, etc.) to automatically import all options trades. You can also upload CSV files from any broker that exports trade data.'
              },
              {
                question: 'What options metrics should I track?',
                answer: 'Track win rate by strategy type, average P&L per trade, profit factor, max drawdown, and performance by underlying stock or index. Also analyze by expiration timeline (weekly vs monthly options).'
              },
              {
                question: 'Can I track the Greeks for my options positions?',
                answer: 'Yes. Trade Voyager tracks Delta, Gamma, Theta, and Vega for each options position. This helps you understand your risk exposure and manage your portfolio more effectively.'
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

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#2b4140] to-[#1a2827] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Master Options Trading with Better Tracking</h2>
          <p className="text-xl mb-8 text-gray-200">
            Stop guessing. Start tracking. Become a consistently profitable options trader.
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

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is an options trading journal?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "An options trading journal is a detailed record of all your options trades including calls, puts, and multi-leg spreads. It tracks entry/exit prices, Greeks, P&L, and your reasoning for each trade to help improve your options trading performance."
                }
              },
              {
                "@type": "Question",
                "name": "Can I track multi-leg options strategies?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Trade Voyager automatically groups multi-leg options strategies like iron condors, butterflies, and vertical spreads as single positions. You can see the total P&L and Greeks across all legs."
                }
              },
              {
                "@type": "Question",
                "name": "How do I import options trades?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Connect your broker (Tastytrade, Interactive Brokers, TD Ameritrade, etc.) to automatically import all options trades. You can also upload CSV files from any broker that exports trade data."
                }
              }
            ]
          })
        }}
      />
    </div>
  );
}
