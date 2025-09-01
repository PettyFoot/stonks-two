import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Shield, Users, Target, Zap, Lock, PieChart } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About Us - Trade Voyager',
  description: 'Learn about Trade Voyager, the professional trading analytics platform built for serious traders. Discover our mission, features, and commitment to trader success.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image 
              src="/trade-voyager-logo.png" 
              alt="Trade Voyager Logo" 
              width={48} 
              height={48} 
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager</span>
          </Link>
          <Link href="/">
            <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50">
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-[var(--theme-primary-text)] mb-6">About Trade Voyager</h1>
          <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-3xl mx-auto">
            Empowering traders with professional-grade analytics and performance tracking tools 
            to make informed decisions and improve trading outcomes.
          </p>
        </div>

        {/* Mission Section */}
        <Card className="bg-white shadow-lg mb-12">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold text-[var(--theme-primary-text)] mb-4">Our Mission</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Trade Voyager was built by traders, for traders. We understand the challenges of tracking performance, 
                  analyzing trades, and making data-driven improvements to your trading strategy. Our mission is to provide 
                  professional-grade analytics tools that were previously only available to institutional traders.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  We believe that every trader deserves access to comprehensive performance analytics, secure data management, 
                  and actionable insights that can help improve their trading outcomes. Whether you're a day trader, swing trader, 
                  or long-term investor, Trade Voyager provides the tools you need to succeed.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-[var(--theme-tertiary)]/20 to-[var(--theme-green)]/20 rounded-full flex items-center justify-center">
                  <Target className="h-24 w-24 text-[var(--theme-tertiary)]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--theme-green)] to-[var(--theme-green)]/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-[var(--theme-primary-text)]">Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 text-sm">
                Comprehensive P&L tracking, win rates, and performance metrics to understand your trading results.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--theme-tertiary)] to-[var(--theme-tertiary)]/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-[var(--theme-primary-text)]">Advanced Reports</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 text-sm">
                Generate detailed reports with custom filters, time periods, and analytical breakdowns.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--theme-secondary)] to-[var(--theme-secondary)]/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-[var(--theme-primary-text)]">Broker Integration</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 text-sm">
                Connect with Interactive Brokers, TD Ameritrade, and other major brokers for seamless data import.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary)]/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-lg text-[var(--theme-primary-text)]">Bank-Level Security</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 text-sm">
                Complete data isolation, encryption, and privacy protection for your sensitive trading information.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Why Choose Us Section */}
        <Card className="bg-white shadow-lg mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-[var(--theme-primary-text)] mb-8 text-center">Why Traders Choose Trade Voyager</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-[var(--theme-green)]" />
                  Complete Data Privacy
                </h3>
                <p className="text-gray-700 mb-4">
                  Your trading data never leaves your control. We implement complete user data isolation, 
                  ensuring your information is never mixed with other users or shared with third parties.
                </p>

                <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-3 flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-[var(--theme-tertiary)]" />
                  Professional-Grade Analytics
                </h3>
                <p className="text-gray-700">
                  Access the same level of analytics used by institutional traders. Track everything from 
                  basic P&L to advanced risk metrics and performance attribution analysis.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-[var(--theme-secondary)]" />
                  Built by Traders
                </h3>
                <p className="text-gray-700 mb-4">
                  Our platform is designed by active traders who understand the real challenges of 
                  performance tracking and analysis. Every feature is built with practical trading needs in mind.
                </p>

                <h3 className="text-xl font-semibold text-[var(--theme-primary-text)] mb-3 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-[var(--theme-green)]" />
                  Easy Integration
                </h3>
                <p className="text-gray-700">
                  Connect your existing broker accounts or import CSV files with our intelligent 
                  format detection. Start tracking your performance in minutes, not hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Security */}
        <Card className="bg-gradient-to-r from-[var(--theme-primary)]/5 to-[var(--theme-tertiary)]/5 border-[var(--theme-primary)]/20 mb-12">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-[var(--theme-tertiary)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[var(--theme-primary-text)] mb-4">Security & Reliability</h2>
            <p className="text-gray-700 leading-relaxed max-w-3xl mx-auto mb-6">
              We understand that your trading data is highly sensitive. That's why we've implemented bank-level 
              security measures including end-to-end encryption, secure hosting, regular security audits, 
              and complete user data isolation. Your trading strategies and performance data remain confidential and secure.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="font-semibold text-[var(--theme-primary-text)] mb-2">Data Encryption</h3>
                <p className="text-sm text-gray-600">All data encrypted in transit and at rest</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--theme-primary-text)] mb-2">Regular Backups</h3>
                <p className="text-sm text-gray-600">Automated backups with point-in-time recovery</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--theme-primary-text)] mb-2">User Isolation</h3>
                <p className="text-sm text-gray-600">Complete separation of user data and accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Started CTA */}
        <Card className="bg-gradient-to-r from-[var(--theme-tertiary)]/10 to-[var(--theme-green)]/10 border-[var(--theme-tertiary)]/30">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold text-[var(--theme-tertiary)] mb-4">
              Ready to Improve Your Trading Performance?
            </h2>
            <p className="text-lg text-[var(--theme-tertiary)] mb-6 max-w-2xl mx-auto">
              Join thousands of traders who use Trade Voyager to track their performance, 
              analyze their trades, and make data-driven improvements to their trading strategies.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link href="/demo">
                <Button size="lg" className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                  Try Demo Mode
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-[var(--theme-tertiary)] text-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/10">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}