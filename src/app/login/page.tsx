'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Shield, Users } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F7FB] via-[#FFFFFF] to-[#E5E7EB] flex items-center justify-center p-4">
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
              <span className="text-2xl font-bold text-[#0B1220]">Trade Voyager</span>
            </div>
            <h1 className="text-4xl font-bold text-[#0B1220] leading-tight">
              Professional Trading<br />
              <span className="text-[#2563EB]">Analytics Platform</span>
            </h1>
            <p className="text-lg text-[#6B7280] max-w-lg">
              Track, analyze, and improve your trading performance with comprehensive analytics and insights.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-[#E5E7EB]">
              <TrendingUp className="h-5 w-5 text-[#16A34A] mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#0B1220]">Performance Tracking</h3>
                <p className="text-sm text-[#6B7280]">Real-time P&L and analytics</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-[#E5E7EB]">
              <Shield className="h-5 w-5 text-[#2563EB] mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#0B1220]">Secure Data</h3>
                <p className="text-sm text-[#6B7280]">Bank-level security</p>
              </div>
            </div>
          </div>

          {/* Demo Mode CTA */}
          <div className="p-6 bg-gradient-to-r from-[#F3F4F6] to-[#E5E7EB] rounded-xl border">
            <h3 className="font-semibold text-[#0B1220] mb-2">Try Demo Mode</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              Explore all features with sample data before creating your account.
            </p>
            <Link href="/demo">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md bg-white border-[#E5E7EB]">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-[#0B1220]">Welcome Back</CardTitle>
              <p className="text-[#6B7280]">Sign in to your trading account</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/api/auth/login">
                <Button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                  Sign In
                </Button>
              </Link>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E7EB]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-[#6B7280]">or</span>
                </div>
              </div>

              <Link href="/api/auth/signup">
                <Button variant="outline" className="w-full border-[#E5E7EB] text-[#0B1220] hover:bg-[#F9FAFB]">
                  Create New Account
                </Button>
              </Link>

              <div className="text-center space-y-2">
                <p className="text-xs text-[#6B7280]">
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