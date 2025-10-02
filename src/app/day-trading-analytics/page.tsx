import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  BarChart3,
  Clock,
  Target,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import Footer from '@/components/Footer';
import { BreadcrumbStructuredData } from '@/components/SEO/StructuredData';
import { ServiceStructuredData } from '@/components/SEO/ServiceStructuredData';

export const metadata: Metadata = {
  title: 'Day Trading Analytics | Professional Day Trader Performance Tracking',
  description: 'Advanced day trading analytics platform. Real-time P&L tracking, intraday performance metrics, and professional analytics tools designed specifically for day traders.',
  keywords: 'day trading analytics, day trader performance tracking, intraday analytics, real-time P&L, day trading metrics, scalping analytics',
  alternates: {
    canonical: 'https://tradevoyageranalytics.com/day-trading-analytics',
  },
};

const dayTradingFeatures = [
  {
    icon: Clock,
    title: 'Real-Time P&L Tracking',
    description: 'Monitor your day trading performance in real-time with millisecond precision. Track your P&L throughout the trading session.',
  },
  {
    icon: BarChart3,
    title: 'Intraday Performance Metrics',
    description: 'Detailed analytics for day trading including win rate by time of day, average trade duration, and session performance.',
  },
  {
    icon: Target,
    title: 'Scalping Analytics',
    description: 'Specialized metrics for scalpers including tick-by-tick analysis, spread capture rates, and high-frequency trading statistics.',
  },
  {
    icon: Shield,
    title: 'Risk Management Tools',
    description: 'Day trading specific risk controls including position sizing calculators, drawdown alerts, and daily loss limits.',
  },
  {
    icon: Zap,
    title: 'Fast Execution Tracking',
    description: 'Track execution speed, slippage analysis, and order fill quality for high-frequency day trading strategies.',
  },
  {
    icon: TrendingUp,
    title: 'Market Session Analysis',
    description: 'Performance breakdown by market sessions (pre-market, open, mid-day, close) to optimize your trading schedule.',
  },
];

const dayTradingStats = [
  { label: 'Average Day Trader Win Rate', value: '52%', description: 'Industry average' },
  { label: 'Our Users Average', value: '67%', description: 'With proper analytics' },
  { label: 'Trades Analyzed Daily', value: '50K+', description: 'Real-time processing' },
  { label: 'Average Improvement', value: '23%', description: 'In first 30 days' },
];

export default function DayTradingAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/trade-voyager-logo.png"
              alt="Trade Voyager Analytics Logo"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager Analytics</span>
          </Link>

          <div className="flex space-x-4">
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--theme-primary-text)] mb-6">
                Day Trading Analytics Platform
              </h1>
              <p className="text-xl text-[var(--theme-secondary-text)] mb-8">
                Professional analytics platform designed specifically for day traders. Real-time P&L tracking,
                intraday performance metrics, and advanced analytics to optimize your day trading strategy.
              </p>
              <div className="flex space-x-4 mb-8">
                <Link href="/pricing">
                  <Button size="lg" className="group">
                    Try Free Demo
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg">
                    View Pricing
                  </Button>
                </Link>
              </div>
              <div className="flex items-center space-x-6 text-sm text-[var(--theme-secondary-text)]">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>Real-time P&L</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>No setup required</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
                <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-6">
                  Day Trading Performance
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {dayTradingStats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl font-bold text-[var(--theme-accent)] mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm text-[var(--theme-secondary-text)] mb-1">
                        {stat.label}
                      </div>
                      <div className="text-xs text-[var(--theme-secondary-text)]">
                        {stat.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-black/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--theme-primary-text)] mb-4">
              Built for Day Traders
            </h2>
            <p className="text-xl text-[var(--theme-secondary-text)] max-w-3xl mx-auto">
              Every feature designed specifically for the unique needs of day trading.
              From scalping to swing trades within the day.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dayTradingFeatures.map((feature, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-[var(--theme-accent)]/20 rounded-lg">
                      <feature.icon className="w-6 h-6 text-[var(--theme-accent)]" />
                    </div>
                    <CardTitle className="text-[var(--theme-primary-text)]">
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--theme-secondary-text)]">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[var(--theme-primary-text)] mb-6">
                Why Day Traders Choose Our Platform
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-[var(--theme-accent)]/20 rounded-lg mt-1">
                    <CheckCircle className="w-5 h-5 text-[var(--theme-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--theme-primary-text)] mb-2">
                      Real-Time Performance Tracking
                    </h3>
                    <p className="text-[var(--theme-secondary-text)]">
                      Monitor your P&L, position sizes, and risk in real-time throughout your trading session.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-[var(--theme-accent)]/20 rounded-lg mt-1">
                    <CheckCircle className="w-5 h-5 text-[var(--theme-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--theme-primary-text)] mb-2">
                      Advanced Day Trading Metrics
                    </h3>
                    <p className="text-[var(--theme-secondary-text)]">
                      Specialized analytics including time-of-day performance, session analysis, and scalping metrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-[var(--theme-accent)]/20 rounded-lg mt-1">
                    <CheckCircle className="w-5 h-5 text-[var(--theme-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--theme-primary-text)] mb-2">
                      Risk Management Tools
                    </h3>
                    <p className="text-[var(--theme-secondary-text)]">
                      Built-in risk controls, position sizing calculators, and daily loss limits to protect your capital.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
              <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-6">
                Start Tracking Your Day Trading Performance
              </h3>
              <p className="text-[var(--theme-secondary-text)] mb-6">
                Join thousands of day traders who have improved their performance with our analytics platform.
              </p>
              <div className="space-y-4">
                <Link href="/pricing" className="block">
                  <Button className="w-full group">
                    Try Free Demo
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/pricing" className="block">
                  <Button variant="outline" className="w-full">
                    View Pricing Plans
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BreadcrumbStructuredData items={[
        { name: 'Day Trading Analytics', url: '/day-trading-analytics' }
      ]} />
      <ServiceStructuredData services={[
        {
          title: 'Day Trading Analytics',
          description: 'Real-time P&L tracking and intraday performance analysis for day traders.',
        },
        {
          title: 'Scalping Metrics',
          description: 'Specialized analytics for high-frequency trading and scalping strategies.',
        },
      ]} />
      <Footer />
    </div>
  );
}