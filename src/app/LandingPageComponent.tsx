'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Shield, Users, ArrowRight, Play, ChevronDown } from 'lucide-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { SoftwareApplicationStructuredData } from '@/components/SEO';
import { TradingFAQStructuredData } from '@/components/SEO/FAQStructuredData';
import { OptimizedLogo } from '@/components/OptimizedImage';
import Footer from '@/components/Footer';
import { LoadingFallback, usePerformanceMonitor } from '@/components/Performance/LoadingOptimizer';
import { WebGLCausticsBackground } from '@/components/backgrounds';

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
      
      {/* Hero Section - Full Screen */}
      <div className="h-screen w-full relative overflow-hidden">
        <WebGLCausticsBackground 
          intensity={0.7}
          speed={0.8}
          color={[0.8, 0.95, 1.0]}
          backgroundColor={[0.05, 0.15, 0.3]}
          fallbackToCSS={true}
        />
        
        {/* Navigation - Absolute positioned at top */}
        <nav className="absolute top-0 left-0 right-0 z-20 p-8" role="navigation" aria-label="Main navigation">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <OptimizedLogo size="xlarge" priority={true} className="drop-shadow-sm" />
              
              <div className="flex items-center space-x-8">
                <Link href="/about" className="text-white hover:text-[var(--theme-tertiary)] text-lg font-medium transition-colors">
                  About Us
                </Link>
                <Link href="/features" className="text-white hover:text-[var(--theme-tertiary)] text-lg font-medium transition-colors">
                  Features
                </Link>
                <Link href="/demo" className="text-white hover:text-[var(--theme-tertiary)] text-lg font-medium transition-colors">
                  Demo
                </Link>
              </div>
              
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost" className="text-white hover:bg-white/10 text-lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Content - Perfect Center */}
        <div className="absolute -inset-10 flex items-center justify-center z-30" aria-labelledby="hero-heading">
          <div className="text-center space-y-12 max-w-4xl mx-auto px-6">
            <h1 id="hero-heading" className="text-9xl font-bold text-white mb-9 leading-tight">
              Elevate<br />
              Your<br />
              <span className="text-[var(--theme-tertiary)]">Edge</span>
            </h1>
            <p className="text-4xl text-white/90 mb-12 max-w-3xl mx-auto">
              Harness powerful analytics to gain clarity, consistency, and an edge that lasts.
            </p>
            
            <div className="flex items-center justify-center space-x-6">
              <Button 
                size="lg" 
                className="bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white px-12 py-6 text-2xl font-semibold rounded-lg"
                onClick={startDemo}
                disabled={isStartingDemo}
                aria-label="Experience Edge"
              >
                {isStartingDemo ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mr-3"></div>
                    Starting Demo...
                  </>
                ) : (
                  "Experience Edge"
                )}
              </Button>
              <Button 
                size="lg" 
                className="bg-[var(--theme-tertiary)]/80 hover:bg-[var(--theme-tertiary)]/60 text-white px-12 py-6 text-2xl font-semibold rounded-lg"
                onClick={startDemo}
                disabled={isStartingDemo}
                aria-label="Try Demo"
              >
                {isStartingDemo ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mr-3"></div>
                    Starting Demo...
                  </>
                ) : (
                  "Demo"
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
          <ChevronDown className="h-6 w-6 text-white/50" />
        </div>
      </div>

      {/* Footer - Outside container but with higher z-index */}
      <div className="relative z-40">
        <Footer />
      </div>
    </>
  );
}