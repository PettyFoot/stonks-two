'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import Footer from '@/components/Footer';
import { InlineTriangleLoader } from '@/components/ui/TriangleLoader';
import { WebGLCausticsBackground } from '@/components/backgrounds';
import { DemoCleanup } from '@/lib/demo/demoCleanup';

export default function LoginPageComponent() {
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  
  // Clear demo data on component mount to ensure clean state
  useEffect(() => {
    const clearDemoDataOnMount = async () => {
      if (DemoCleanup.hasDemoData()) {
        console.log('Login page: Clearing demo data on mount');
        await DemoCleanup.clearAllDemoData();
      }
    };
    
    clearDemoDataOnMount();
  }, []);

  const clearDemoData = async () => {
    try {
      console.log('Starting comprehensive demo data cleanup before login...');
      
      // Use the comprehensive cleanup method
      await DemoCleanup.clearAllDemoData();
      
      // Additional cleanup - force clear specific demo-related items
      if (typeof window !== 'undefined') {
        // Clear demo mode flag specifically
        localStorage.removeItem('demo-mode');
        
        // Clear any demo session cookies by calling the server endpoint
        await fetch('/api/demo/logout', { 
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }).catch(err => console.warn('Error clearing server-side demo session:', err));
        
        // Add a small delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Demo data cleanup completed before login');
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
      <div className="min-h-screen w-full relative overflow-hidden">
        <WebGLCausticsBackground 
          intensity={0.7}
          speed={0.8}
          color={[0.8, 0.95, 1.0]}
          backgroundColor={[0.05, 0.15, 0.3]}
          fallbackToCSS={true}
        />
        
        <div className="absolute inset-0 flex items-start justify-center z-30 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl w-full flex flex-col items-center py-8 min-h-full">
            {/* Triangle Apex - Header/Logo Section */}
            <header className="text-center space-y-4 mb-6 sm:mb-12 max-w-2xl flex-shrink-0">
              <div className="flex flex-col items-center justify-center space-y-4 mb-4 sm:mb-6">
                <Image 
                  src="/trade-voyager-logo.png" 
                  alt="Trade Voyager Analytics - Professional Trading Analytics Platform Logo" 
                  width={150} 
                  height={150} 
                  className="rounded-lg sm:w-[180px] sm:h-[180px] lg:w-[200px] lg:h-[200px] max-w-[150px] max-h-[150px] sm:max-w-[180px] sm:max-h-[180px] lg:max-w-[200px] lg:max-h-[200px]"
                  priority
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-oswald text-[var(--theme-primary-text)] leading-tight">
                
              </h1>
            </header>

            {/* Main Content - Stacked Layout */}
            <div className="w-full flex flex-col items-center gap-6 sm:gap-8 max-w-md flex-shrink-0">
              
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