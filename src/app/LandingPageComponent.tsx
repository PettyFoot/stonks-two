'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Shield, Users, ArrowRight, Play } from 'lucide-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { SoftwareApplicationStructuredData } from '@/components/SEO';
import { TradingFAQStructuredData } from '@/components/SEO/FAQStructuredData';
import { OptimizedLogo } from '@/components/OptimizedImage';
import Footer from '@/components/Footer';
import { LoadingFallback, usePerformanceMonitor } from '@/components/Performance/LoadingOptimizer';

export default function LandingPageComponent() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  
  // Monitor Core Web Vitals
  usePerformanceMonitor();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const startDemo = async () => {
    if (isStartingDemo) return;
    
    setIsStartingDemo(true);
    try {
      const response = await fetch('/api/demo/start', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Set demo mode in localStorage immediately
        if (data.setDemoMode) {
          localStorage.setItem('demo-mode', 'true');
          console.log('Set demo mode in localStorage before navigation');
        }
        
        // Add a small delay to ensure cookies are set, then use hard navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        window.location.href = data.redirect || '/dashboard';
      } else {
        console.error('Failed to start demo session');
        setIsStartingDemo(false);
      }
    } catch (error) {
      console.error('Error starting demo session:', error);
      setIsStartingDemo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--theme-tertiary)] mx-auto mb-4"></div>
          <p className="text-[var(--theme-primary-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }
  
  return (
    <>
      {/* Structured Data for Software Application */}
      <SoftwareApplicationStructuredData />
      {/* FAQ Structured Data */}
      <TradingFAQStructuredData />
      
      <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)]">
        {/* Navigation */}
        <nav className="p-6" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <OptimizedLogo size="large" priority={true} />
              <span className="text-2xl font-bold text-[var(--theme-primary-text)]">Trade Voyager Analytics</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50"
                onClick={startDemo}
                disabled={isStartingDemo}
                aria-label="Try Trade Voyager Analytics demo with sample trading data"
              >
                {isStartingDemo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Starting Demo...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Try Demo
                  </>
                )}
              </Button>
              <Link href="/login">
                <Button className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20" aria-labelledby="hero-heading">
          <div className="text-center mb-16">
            <h1 id="hero-heading" className="text-5xl font-bold text-[var(--theme-primary-text)] mb-6 leading-tight">
              Professional Trade Analytics<br />
              <span className="text-[var(--theme-tertiary)]">Platform</span>
            </h1>
            <p className="text-xl text-[var(--theme-primary-text)] mb-8 max-w-3xl mx-auto">
              Master your trading performance with advanced trade analytics, 
              real-time performance tracking, and <Link href="/features" className="text-[var(--theme-tertiary)] hover:underline">comprehensive trading insights</Link>. 
              Connect with your broker for automatic trade analytics generation.
            </p>
            
            <div className="flex items-center justify-center space-x-4">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/50"
                onClick={startDemo}
                disabled={isStartingDemo}
                aria-label="Explore Trade Voyager Analytics demo with sample trading data"
              >
                {isStartingDemo ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                    Starting Demo...
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 mr-2" />
                    Explore Demo
                  </>
                )}
              </Button>
              <Link href="/login">
                <Button size="lg" className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <section className="grid md:grid-cols-3 gap-8 mb-20" aria-labelledby="features-heading">
            <h2 id="features-heading" className="sr-only">Key Features of Trade Voyager Analytics</h2>
            
            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-green)] to-[var(--theme-green)]/80 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Advanced Trade Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Comprehensive trade analytics including real-time P&L tracking, win rates, risk metrics, and detailed performance breakdowns for every trade. <Link href="/features" className="text-[var(--theme-tertiary)] hover:underline text-sm">Learn more →</Link>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-tertiary)] to-[var(--theme-tertiary)]/80 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Bank-level security with complete user data isolation and privacy protection.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--theme-primary)] hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--theme-secondary)] to-[var(--theme-secondary)]/80 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <CardTitle className="text-[var(--theme-primary-text)]">Broker Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--theme-primary-text)]">
                  Import trades from Interactive Brokers, TD Ameritrade, and other major brokers.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Demo CTA */}
          <section aria-labelledby="demo-cta-heading">
            <Card className="bg-gradient-to-r from-[var(--theme-tertiary)]/10 to-[var(--theme-tertiary)]/20 border-[var(--theme-tertiary)]/30 text-center">
              <CardContent className="p-12">
                <h2 id="demo-cta-heading" className="text-3xl font-bold text-[var(--theme-tertiary)] mb-4">
                  Try Demo Mode
                </h2>
                <p className="text-lg text-[var(--theme-tertiary)] mb-8 max-w-2xl mx-auto">
                  Explore all features with sample trading data. No signup required - 
                  see exactly how Trade Voyager Analytics can improve your trading performance. 
                  Ready to upgrade? Check our <Link href="/pricing" className="underline hover:no-underline">flexible pricing plans</Link>.
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
          </section>
        </section>

        <Footer />
      </div>
    </>
  );
}