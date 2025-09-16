'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { SoftwareApplicationStructuredData } from '@/components/SEO';
import { TradingFAQStructuredData } from '@/components/SEO/FAQStructuredData';
import { OptimizedLogo } from '@/components/OptimizedImage';
import Footer from '@/components/Footer';
import { usePerformanceMonitor } from '@/components/Performance/LoadingOptimizer';
import { InlineTriangleLoader, PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { WebGLCausticsBackground } from '@/components/backgrounds';

export default function LandingPageComponent() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
          <PageTriangleLoader text="Loading..." />
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
      <div className="h-screen w-full relative overflow-hidden flex flex-col">
        <WebGLCausticsBackground 
          intensity={0.7}
          speed={0.8}
          color={[0.8, 0.95, 1.0]}
          backgroundColor={[0.05, 0.15, 0.3]}
          fallbackToCSS={true}
        />
        
        {/* Navigation - Relative positioned at top */}
        <nav className="relative z-50 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 lg:pt-4 pb-4" role="navigation" aria-label="Main navigation">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <OptimizedLogo size="large" priority={true} className="drop-shadow-sm" />
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
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
              
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost" className="text-white hover:bg-white/10 text-lg">
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden text-white p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden absolute top-full left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/20 mt-4 z-50">
                <div className="flex flex-col space-y-4 p-6">
                  <Link 
                    href="/about" 
                    className="text-white hover:text-[var(--theme-tertiary)] text-lg font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About Us
                  </Link>
                  <Link 
                    href="/features" 
                    className="text-white hover:text-[var(--theme-tertiary)] text-lg font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link 
                    href="/demo" 
                    className="text-white hover:text-[var(--theme-tertiary)] text-lg font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Demo
                  </Link>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full text-white hover:bg-white/10 text-lg">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Content - Perfect Center */}
        <div className="relative flex-1 flex items-center justify-center z-30 pointer-events-none" aria-labelledby="hero-heading">
          <div className="text-center space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 max-w-4xl mx-auto px-4 sm:px-6">
            <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-oswald text-white mb-4 sm:mb-6 md:mb-9 leading-tight">
              <span className="text-black">Voyage Beyond the Market Depths</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-black/90 mb-6 sm:mb-8 md:mb-10 lg:mb-12 max-w-3xl mx-auto">
              Explore deeper insights, chart smarter strategies, and trade with true direction.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto pointer-events-auto">
              <Link href="/login" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white px-6 py-3 sm:px-8 sm:py-4 lg:px-12 lg:py-6 text-base sm:text-lg lg:text-2xl font-semibold rounded-lg"
                  aria-label="Voyage"
                >
                  Voyage
                </Button>
              </Link>
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-[var(--theme-tertiary)]/80 hover:bg-[var(--theme-tertiary)]/60 text-white px-6 py-3 sm:px-8 sm:py-4 lg:px-12 lg:py-6 text-base sm:text-lg lg:text-2xl font-semibold rounded-lg"
                onClick={startDemo}
                disabled={isStartingDemo}
                aria-label="Try Demo"
              >
                {isStartingDemo ? (
                  <>
                    <InlineTriangleLoader size="sm" />
                    <span className="ml-3">Starting Demo...</span>
                  </>
                ) : (
                  "Demo"
                )}
              </Button>
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