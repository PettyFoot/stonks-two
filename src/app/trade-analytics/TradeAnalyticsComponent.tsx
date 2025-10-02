'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Target, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { OptimizedLogo } from '@/components/OptimizedImage';
import Footer from '@/components/Footer';

export default function TradeAnalyticsComponent() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
        {/* Navigation */}
        <nav className="p-6" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <OptimizedLogo size="large" priority={true} />
              <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager Analytics</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50">
                  Home
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20" aria-labelledby="trade-analytics-heading">
          <div className="text-center mb-16">
            <h1 id="trade-analytics-heading" className="text-6xl font-bold text-[var(--theme-primary-text)] mb-6 leading-tight">
              Advanced <span className="text-[var(--theme-tertiary)]">Trade Analytics</span><br />
              for Professional Traders
            </h1>
            <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-4xl mx-auto">
              Transform your trading performance with comprehensive trade analytics. Our platform provides real-time trade metrics, 
              detailed performance analysis, and actionable insights to optimize every aspect of your trading strategy.
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-12">
              <Link href="/login">
                <Button size="lg" className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white">
                  Start Free Trade Analytics
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* What is Trade Analytics */}
          <section className="mb-20">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-6">
                What is Trade Analytics?
              </h2>
              <p className="text-lg text-[var(--theme-primary-text)] mb-8">
                Trade analytics is the comprehensive analysis of individual trading transactions to identify patterns, 
                measure performance, and optimize trading strategies. Unlike portfolio analytics that look at overall holdings, 
                trade analytics focuses on the execution, timing, and profitability of each individual trade.
              </p>
            </div>
          </section>

          {/* Key Features */}
          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20" aria-labelledby="features-heading">
            <h2 id="features-heading" className="sr-only">Trade Analytics Features</h2>
            
            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-green)] to-[var(--theme-green)]/80 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Real-Time Trade Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Monitor trade analytics in real-time with automatic calculation of P&L, win rates, 
                  average trade duration, and risk-adjusted returns for every position.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-tertiary)] to-[var(--theme-tertiary)]/80 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Performance Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Advanced trade analytics to identify which trades, timeframes, and strategies 
                  contribute most to your overall performance and profitability.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-red)] to-[var(--theme-red)]/80 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Trade Pattern Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Discover patterns in your trading behavior with sophisticated trade analytics 
                  that reveal optimal entry/exit points and timing strategies.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-blue)] to-[var(--theme-blue)]/80 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Risk Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Comprehensive trade analytics for risk management including position sizing analysis, 
                  drawdown metrics, and risk-adjusted performance measurements.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-purple)] to-[var(--theme-purple)]/80 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Broker Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Automatic trade analytics generation with direct broker connections. 
                  No manual data entry required - get instant insights from your trading activity.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-orange)] to-[var(--theme-orange)]/80 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Custom Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Generate detailed trade analytics reports for tax purposes, performance reviews, 
                  and strategy optimization with customizable metrics and timeframes.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Why Trade Analytics Matter */}
          <section className="mb-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-8 text-center">
                Why Trade Analytics Are Essential for Success
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-2xl font-bold text-[var(--theme-primary-text)] mb-4">
                    Identify Profitable Patterns
                  </h3>
                  <p className="text-[var(--theme-primary-text)] mb-6">
                    Trade analytics reveal which trading strategies, timeframes, and market conditions 
                    generate the highest returns. By analyzing individual trade performance, you can 
                    focus on what works and eliminate what doesn't.
                  </p>
                  
                  <h3 className="text-2xl font-bold text-[var(--theme-primary-text)] mb-4">
                    Optimize Risk Management
                  </h3>
                  <p className="text-[var(--theme-primary-text)]">
                    Advanced trade analytics help you understand your risk exposure per trade, 
                    optimal position sizes, and maximum acceptable drawdown levels to protect your capital.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-[var(--theme-primary-text)] mb-4">
                    Improve Entry & Exit Timing
                  </h3>
                  <p className="text-[var(--theme-primary-text)] mb-6">
                    Detailed trade analytics show you the optimal times to enter and exit positions 
                    based on your historical performance, helping you avoid emotional decisions.
                  </p>
                  
                  <h3 className="text-2xl font-bold text-[var(--theme-primary-text)] mb-4">
                    Track Performance Over Time
                  </h3>
                  <p className="text-[var(--theme-primary-text)]">
                    Monitor your trading evolution with comprehensive trade analytics that track 
                    performance improvements and help you stay accountable to your trading goals.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center">
            <div className="bg-white rounded-lg p-12 shadow-xl max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-[var(--theme-primary)] mb-6">
                Start Your Trade Analytics Journey Today
              </h2>
              <p className="text-xl text-[var(--theme-primary-text)] mb-8">
                Join thousands of professional traders who use our trade analytics platform to 
                optimize their performance and maximize their profits.
              </p>
              
              <div className="flex items-center justify-center space-x-4">
                <Link href="/login">
                  <Button size="lg" className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white">
                    Get Free Trade Analytics
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </section>
      </div>
      
      <Footer />
    </>
  );
}