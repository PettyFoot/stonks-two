'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Shield, Users } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isStartingDemo, setIsStartingDemo] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-surface)] to-[var(--theme-primary)] flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding & Features */}
        <div className="space-y-8">
          <div className="space-y-4">
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
            <h1 className="text-4xl font-bold text-[var(--theme-primary-text)] leading-tight">
              Professional Trading<br />
              <span className="text-[var(--theme-tertiary)]">Analytics Platform</span>
            </h1>
            <p className="text-lg text-[var(--theme-secondary-text)] max-w-lg">
              Track, analyze, and improve your trading performance with comprehensive analytics and insights.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-[var(--theme-primary)]">
              <TrendingUp className="h-5 w-5 text-[var(--theme-green)] mt-0.5" />
              <div>
                <h3 className="font-semibold text-[var(--theme-primary-text)]">Performance Tracking</h3>
                <p className="text-sm text-[var(--theme-primary-text)]">Real-time P&L and analytics</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-[var(--theme-primary)]">
              <Shield className="h-5 w-5 text-[var(--theme-tertiary)] mt-0.5" />
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
        </div>

        {/* Right Side - Login Form */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md bg-white border-[var(--theme-primary)]">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-[var(--theme-primary-text)]">Welcome Back</CardTitle>
              <p className="text-[var(--theme-primary-text)]">Sign in to your trading account</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/api/auth/login">
                <Button className="w-full bg-[var(--theme-tertiary)] hover:bg-[var(--theme-tertiary)]/80 text-white">
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

              <Link href="/api/auth/signup">
                <Button variant="outline" className="w-full border-[var(--theme-primary)] text-[var(--theme-primary-text)] hover:bg-[var(--theme-primary)]/30">
                  Create New Account
                </Button>
              </Link>

              <div className="text-center space-y-2">
                <p className="text-xs text-[var(--theme-primary-text)]">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}