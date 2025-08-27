'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Shield, Users, ArrowRight, Play } from 'lucide-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--theme-tertiary)] mx-auto mb-4"></div>
          <p className="text-[var(--theme-secondary-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image 
              src="/trade-voyager-logo.png" 
              alt="Trade Voyager Logo" 
              width={40} 
              height={40} 
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/demo">
              <Button variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50">
                <Play className="h-4 w-4 mr-2" />
                Try Demo
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

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-[var(--theme-primary-text)] mb-6 leading-tight">
            Professional Trading<br />
            <span className="text-[var(--theme-tertiary)]">Analytics Platform</span>
          </h1>
          <p className="text-xl text-[var(--theme-secondary-text)] mb-8 max-w-3xl mx-auto">
            Track, analyze, and improve your trading performance with comprehensive analytics, 
            broker integrations, and professional-grade reporting tools.
          </p>
          
          <div className="flex items-center justify-center space-x-4">
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50">
                <Users className="h-5 w-5 mr-2" />
                Explore Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white">
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-green)] to-[var(--theme-green)]/80 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-[var(--theme-primary-text)]">Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--theme-secondary-text)]">
                Real-time P&L tracking, win rates, risk metrics, and comprehensive performance breakdowns.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-tertiary)] to-[var(--theme-tertiary)]/80 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-[var(--theme-primary-text)]">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--theme-secondary-text)]">
                Bank-level security with complete user data isolation and privacy protection.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-secondary)] to-[var(--theme-secondary)]/80 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-[var(--theme-primary-text)]">Broker Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--theme-secondary-text)]">
                Import trades from Interactive Brokers, TD Ameritrade, and other major brokers.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo CTA */}
        <Card className="bg-gradient-to-r from-[var(--theme-tertiary)]/10 to-[var(--theme-tertiary)]/20 border-[var(--theme-tertiary)]/30 text-center">
          <CardContent className="p-12">
            <h2 className="text-3xl font-bold text-[var(--theme-tertiary)] mb-4">
              Try Demo Mode
            </h2>
            <p className="text-lg text-[var(--theme-tertiary)] mb-8 max-w-2xl mx-auto">
              Explore all features with sample trading data. No signup required - 
              see exactly how Trade Voyager can improve your trading performance.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link href="/demo">
                <Button size="lg" className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                  <Play className="h-5 w-5 mr-2" />
                  Launch Demo
                </Button>
              </Link>
              <span className="text-[var(--theme-tertiary)] text-sm">No registration needed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--theme-primary)] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image 
                src="/trade-voyager-logo.png" 
                alt="Trade Voyager Logo" 
                width={32} 
                height={32} 
                className="rounded-lg"
              />
              <span className="font-bold text-[var(--theme-primary-text)]">Trade Voyager</span>
            </div>
            <p className="text-sm text-[var(--theme-secondary-text)]">
              © 2025 Trade Voyager. Built for professional traders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
