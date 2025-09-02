'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Shield, Users } from 'lucide-react';
import Footer from '@/components/Footer';
import { MarketDataCache } from '@/lib/marketData/cache';

export default function LoginPageComponent() {
  const router = useRouter();
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  
  const clearDemoData = () => {
    try {
      localStorage.removeItem('demo-mode');
      MarketDataCache.clear();
      
      // Clear any other demo-related keys
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('demo') || key.includes('stonks_demo')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('Demo data cleared before login');
    } catch (error) {
      console.warn('Error clearing demo data before login:', error);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)] flex flex-col">
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-7xl w-full flex flex-col items-center">
          {/* Triangle Apex - Header/Logo Section */}
          <header className="text-center space-y-4 mb-16 max-w-2xl">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Image 
                src="/trade-voyager-logo.png" 
                alt="Trade Voyager Analytics - Professional Trading Analytics Platform Logo" 
                width={50} 
                height={50} 
                className="rounded-lg"
                priority
              />
              <span className="text-3xl font-bold text-[var(--theme-primary-text)]">Trade Voyager Analytics</span>
            </div>
            <h1 className="text-5xl font-bold text-[var(--theme-primary-text)] leading-tight">
              Professional Trading<br />
              <span className="text-[var(--theme-tertiary)]">Analytics Platform</span>
            </h1>
            <p className="text-xl text-[var(--theme-primary-text)] max-w-2xl mx-auto">
              Track, analyze, and improve your trading performance with comprehensive analytics and insights.
            </p>
          </header>

          {/* Triangle Base - Demo and Sign-in */}
          <div className="w-full flex flex-col lg:flex-row justify-center lg:justify-between items-center gap-8 lg:gap-16 max-w-6xl">
            
            {/* Left Base - Demo Mode Section */}
            <section className="flex-1 max-w-md lg:max-w-lg space-y-6" aria-labelledby="demo-features">
              <h2 id="demo-features" className="sr-only">Trade Voyager Analytics Features</h2>
              
              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-[var(--theme-primary)]">
                  <TrendingUp className="h-5 w-5 text-[var(--theme-green)] mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-[var(--theme-primary-text)]">Performance Tracking</h3>
                    <p className="text-sm text-[var(--theme-primary-text)]">Real-time P&L and analytics</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-[var(--theme-primary)]">
                  <Shield className="h-5 w-5 text-[var(--theme-tertiary)] mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-[var(--theme-primary-text)]">Secure Data</h3>
                    <p className="text-sm text-[var(--theme-primary-text)]">Bank-level security</p>
                  </div>
                </div>
              </div>

              {/* Demo Mode CTA */}
              <div className="p-6 bg-gradient-to-r from-[var(--theme-primary)]/50 to-[var(--theme-primary)] rounded-xl border">
                <h3 className="font-semibold text-[var(--theme-primary-text)] mb-2">Try Demo Mode</h3>
                <p className="text-sm text-[var(--theme-primary-text)] mb-4">
                  Explore all features with sample data before creating your account.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full bg-white text-[var(--theme-primary-text)] border-white hover:bg-gray-50"
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
                      <Users className="h-4 w-4 mr-2" />
                      View Demo
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* Right Base - Sign-in Form */}
            <section className="flex-1 max-w-md lg:max-w-lg flex justify-center" aria-labelledby="signin-heading">
              <Card className="w-full max-w-md bg-white border-[var(--theme-primary)]">
                <CardHeader className="space-y-1 text-center">
                  <CardTitle id="signin-heading" className="text-2xl font-bold text-[var(--theme-primary-text)]">Welcome Back</CardTitle>
                  <p className="text-[var(--theme-primary-text)]">Sign in to your trading account</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/api/auth/login" aria-label="Sign in to your Trade Voyager Analytics account">
                    <Button 
                      className="w-full bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white"
                      onClick={clearDemoData}
                    >
                      Sign In
                    </Button>
                  </Link>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--theme-primary)]" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-[var(--theme-secondary-text)]">or</span>
                    </div>
                  </div>

                  <Link href="/api/auth/signup" aria-label="Create a new Trade Voyager Analytics account">
                    <Button 
                      variant="outline" 
                      className="w-full border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/30"
                      onClick={clearDemoData}
                    >
                      Create New Account
                    </Button>
                  </Link>

                  <div className="text-center space-y-2">
                    <p className="text-xs text-[var(--theme-primary-text)]">
                      By signing in, you agree to our <Link href="/terms" className="underline hover:no-underline">Terms of Service</Link> and <Link href="/privacy" className="underline hover:no-underline">Privacy Policy</Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}