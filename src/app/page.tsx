'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Shield, Users, ArrowRight, Play } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F7FB] via-[#FFFFFF] to-[#E5E7EB]">
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
            <span className="text-2xl font-bold text-[#0B1220]">Trade Voyager</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/demo">
              <Button variant="outline" className="border-[#E5E7EB] text-[#0B1220] hover:bg-[#F9FAFB]">
                <Play className="h-4 w-4 mr-2" />
                Try Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-[#0B1220] mb-6 leading-tight">
            Professional Trading<br />
            <span className="text-[#2563EB]">Analytics Platform</span>
          </h1>
          <p className="text-xl text-[#6B7280] mb-8 max-w-3xl mx-auto">
            Track, analyze, and improve your trading performance with comprehensive analytics, 
            broker integrations, and professional-grade reporting tools.
          </p>
          
          <div className="flex items-center justify-center space-x-4">
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-[#E5E7EB] text-[#0B1220] hover:bg-[#F9FAFB]">
                <Users className="h-5 w-5 mr-2" />
                Explore Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="bg-[#16A34A] hover:bg-[#15803d] text-white">
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="bg-white border-[#E5E7EB] hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-[#16A34A] to-[#15803d] rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-[#0B1220]">Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#6B7280]">
                Real-time P&L tracking, win rates, risk metrics, and comprehensive performance breakdowns.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E7EB] hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-[#0B1220]">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#6B7280]">
                Bank-level security with complete user data isolation and privacy protection.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E5E7EB] hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-[#0B1220]">Broker Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#6B7280]">
                Import trades from Interactive Brokers, TD Ameritrade, and other major brokers.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo CTA */}
        <Card className="bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] border-[#BAE6FD] text-center">
          <CardContent className="p-12">
            <h2 className="text-3xl font-bold text-[#0369A1] mb-4">
              Try Demo Mode
            </h2>
            <p className="text-lg text-[#0369A1] mb-8 max-w-2xl mx-auto">
              Explore all features with sample trading data. No signup required - 
              see exactly how Trade Voyager can improve your trading performance.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link href="/demo">
                <Button size="lg" className="bg-[#0369A1] hover:bg-[#0284C7] text-white">
                  <Play className="h-5 w-5 mr-2" />
                  Launch Demo
                </Button>
              </Link>
              <span className="text-[#0369A1] text-sm">No registration needed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white">
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
              <span className="font-bold text-[#0B1220]">Trade Voyager</span>
            </div>
            <p className="text-sm text-[#6B7280]">
              © 2025 Trade Voyager. Built for professional traders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
