'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Shield, Users } from 'lucide-react';
import Footer from '@/components/Footer';
import { InlineTriangleLoader } from '@/components/ui/TriangleLoader';
import { MarketDataCache } from '@/lib/marketData/cache';
import { WebGLCausticsBackground } from '@/components/backgrounds';

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
    <>
      {/* Login Section - Full Screen */}
      <div className="h-screen w-full relative overflow-hidden">
        <WebGLCausticsBackground 
          intensity={0.7}
          speed={0.8}
          color={[0.8, 0.95, 1.0]}
          backgroundColor={[0.05, 0.15, 0.3]}
          fallbackToCSS={true}
        />
        
        <div className="absolute inset-0 flex items-center justify-center z-30 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl w-full flex flex-col items-center py-4 sm:py-0">
            {/* Triangle Apex - Header/Logo Section */}
            <header className="text-center space-y-4 mb-8 sm:mb-16 max-w-2xl">
              <div className="flex flex-col items-center justify-center space-y-4 mb-4 sm:mb-6">
                <Image 
                  src="/trade-voyager-logo.png" 
                  alt="Trade Voyager Analytics - Professional Trading Analytics Platform Logo" 
                  width={200} 
                  height={200} 
                  className="rounded-lg sm:w-[250px] sm:h-[250px]"
                  priority
                />
                <span className="text-2xl sm:text-3xl lg:text-4xl font-oswald text-[var(--theme-secondary-text)]">Trade Voyager Analytics</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-oswald text-[var(--theme-primary-text)] leading-tight">
                Trading<br />
                <span className="text-[var(--theme-tertiary)]">Analytics Platform</span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-[var(--theme-primary-text)] max-w-2xl mx-auto">
                Track, analyze, and improve your trading performance with comprehensive analytics and insights.
              </p>
            </header>

            {/* Main Content - Stacked Layout */}
            <div className="w-full flex flex-col items-center gap-8 max-w-md">
              
              {/* Sign-in Form - Top */}
              <section className="w-full" aria-labelledby="signin-heading">
                <Card className="w-full bg-white border-[var(--theme-primary)]">
                  <CardHeader className="space-y-1 text-center">
                    <CardTitle id="signin-heading" className="text-2xl font-bold text-[var(--theme-primary-text)]">Welcome Back</CardTitle>
                    <p className="text-[var(--theme-primary-text)]">Sign into your account</p>
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

              {/* Demo Mode Section - Bottom */}
              <section className="w-full" aria-labelledby="demo-features">
                <h2 id="demo-features" className="sr-only">Trade Voyager Analytics Features</h2>
                
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
                        <InlineTriangleLoader size="sm" />
                        <span className="ml-2">Starting Demo...</span>
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
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Outside container but with higher z-index */}
      <div className="relative z-40">
        <Footer />
      </div>
    </>
  );
}