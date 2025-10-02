import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, ArrowRight, TrendingUp, DollarSign, Percent } from 'lucide-react';
import Footer from '@/components/Footer';
import { BreadcrumbNavigation } from '@/components/SEO/BreadcrumbNavigation';
import { BreadcrumbStructuredData } from '@/components/SEO/StructuredData';
import TradingCalculatorComponent from './TradingCalculatorComponent';

export const metadata: Metadata = {
  title: 'Trading Calculator | Position Size & Risk Management Tool | Trade Voyager Analytics',
  description: 'Free trading calculator to determine optimal position size, risk/reward ratios, and profit targets. Essential tool for professional traders using proper risk management.',
  keywords: 'trading calculator, position size calculator, risk management calculator, trading tools, profit calculator, stop loss calculator',
  openGraph: {
    title: 'Free Trading Calculator | Position Size & Risk Management',
    description: 'Calculate position sizes, risk/reward ratios, and profit targets with our professional trading calculator. Free tool for better risk management.',
    type: 'website',
  },
};

export default function TradingCalculatorPage() {
  const breadcrumbItems = [
    { name: 'Tools', url: '/tools' },
    { name: 'Trading Calculator', url: '/tools/trading-calculator' }
  ];

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
            <Link href="/features">
              <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10">
                Features
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <BreadcrumbNavigation items={breadcrumbItems} />
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-[var(--theme-tertiary)]/10 rounded-xl">
            <Calculator className="h-16 w-16 text-[var(--theme-tertiary)]" />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-[var(--theme-primary-text)] mb-6">
          Trading Calculator
        </h1>
        <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-3xl mx-auto">
          Calculate optimal position sizes, risk/reward ratios, and profit targets. 
          Essential tool for professional <Link href="/features" className="text-[var(--theme-tertiary)] hover:underline">risk management</Link> and trading success.
        </p>
      </section>

      {/* Calculator Tool */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <TradingCalculatorComponent />
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-12 text-center">
          Why Use a Trading Calculator?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="p-3 bg-[var(--theme-tertiary)]/10 rounded-lg w-fit mb-4">
                <TrendingUp className="h-6 w-6 text-[var(--theme-tertiary)]" />
              </div>
              <CardTitle className="text-xl text-[var(--theme-primary-text)]">
                Proper Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Calculate the right position size based on your account balance and risk tolerance. 
                Never risk more than you can afford to lose on any single trade.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="p-3 bg-[var(--theme-tertiary)]/10 rounded-lg w-fit mb-4">
                <DollarSign className="h-6 w-6 text-[var(--theme-tertiary)]" />
              </div>
              <CardTitle className="text-xl text-[var(--theme-primary-text)]">
                Maximize Profitability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Optimize your position sizes to maximize returns while maintaining proper risk levels. 
                Calculate profit targets and stop loss levels before entering trades.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="p-3 bg-[var(--theme-tertiary)]/10 rounded-lg w-fit mb-4">
                <Percent className="h-6 w-6 text-[var(--theme-tertiary)]" />
              </div>
              <CardTitle className="text-xl text-[var(--theme-primary-text)]">
                Risk/Reward Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Evaluate potential trades before executing them. Ensure every trade has a favorable 
                risk/reward ratio that aligns with your trading strategy.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-6">
          Ready for Professional Trading Analytics?
        </h2>
        <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-2xl mx-auto">
          This calculator is just one tool. Get comprehensive trading analytics, performance tracking, 
          and <Link href="/features" className="text-[var(--theme-tertiary)] hover:underline">professional reports</Link> with Trade Voyager Analytics.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/10 px-8 py-3 text-lg">
              Try Free Demo
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white px-8 py-3 text-lg">
              View Pricing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <BreadcrumbStructuredData items={breadcrumbItems} />
      <Footer />
    </div>
  );
}