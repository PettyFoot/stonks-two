'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  FileSpreadsheet, 
  BarChart3, 
  CheckCircle, 
  ArrowRight,
  User,
  Target,
  DollarSign
} from 'lucide-react';
import Image from 'next/image';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

export default function OnboardingPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState({
    tradingExperience: '',
    primaryGoal: '',
    riskTolerance: '',
    monthlyVolume: ''
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Trade Voyager',
      description: 'Let&apos;s get you set up with your trading analytics platform',
      icon: <TrendingUp className="h-6 w-6" />,
      completed: currentStep > 0
    },
    {
      id: 'profile',
      title: 'Trading Profile',
      description: 'Tell us about your trading experience and goals',
      icon: <User className="h-6 w-6" />,
      completed: currentStep > 1
    },
    {
      id: 'data-setup',
      title: 'Data Setup',
      description: 'Choose how you want to import your trading data',
      icon: <FileSpreadsheet className="h-6 w-6" />,
      completed: currentStep > 2
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'Explore your new trading analytics dashboard',
      icon: <BarChart3 className="h-6 w-6" />,
      completed: currentStep > 3
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/dashboard');
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F6F7FB] via-[#FFFFFF] to-[#E5E7EB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2563EB] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Image 
                src="/trade-voyager-logo.png" 
                alt="Trade Voyager Logo" 
                width={48} 
                height={48} 
                className="rounded-lg"
              />
              <h1 className="text-3xl font-bold text-[#0B1220]">Trade Voyager</h1>
            </div>
            <h2 className="text-2xl font-bold text-[#0B1220]">Welcome, {user.name}!</h2>
            <p className="text-lg text-[#6B7280] max-w-md mx-auto">
              You&apos;re about to transform how you track and analyze your trading performance. 
              Let&apos;s get you set up in just a few steps.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-[#F0F9FF] rounded-lg">
                <TrendingUp className="h-8 w-8 text-[#2563EB] mx-auto mb-2" />
                <h3 className="font-semibold text-[#0B1220]">Analytics</h3>
                <p className="text-sm text-[#6B7280]">Comprehensive performance tracking</p>
              </div>
              <div className="p-4 bg-[#F0FDF4] rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-[#16A34A] mx-auto mb-2" />
                <h3 className="font-semibold text-[#0B1220]">Data Import</h3>
                <p className="text-sm text-[#6B7280]">Easy broker integration</p>
              </div>
              <div className="p-4 bg-[#FEF7FF] rounded-lg">
                <BarChart3 className="h-8 w-8 text-[#7C3AED] mx-auto mb-2" />
                <h3 className="font-semibold text-[#0B1220]">Insights</h3>
                <p className="text-sm text-[#6B7280]">Actionable trading insights</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#0B1220] mb-2">Trading Profile</h2>
              <p className="text-[#6B7280]">Help us personalize your experience</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#0B1220] mb-2">
                  Trading Experience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['Beginner', 'Intermediate', 'Expert'].map((level) => (
                    <Button
                      key={level}
                      variant={profileData.tradingExperience === level ? 'default' : 'outline'}
                      onClick={() => setProfileData({...profileData, tradingExperience: level})}
                      className="justify-center"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B1220] mb-2">
                  Primary Trading Goal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Income Generation', 'Wealth Building', 'Learning', 'Professional Trading'].map((goal) => (
                    <Button
                      key={goal}
                      variant={profileData.primaryGoal === goal ? 'default' : 'outline'}
                      onClick={() => setProfileData({...profileData, primaryGoal: goal})}
                      className="justify-center"
                    >
                      {goal}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B1220] mb-2">
                  Monthly Trading Volume
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['< $10K', '$10K - $50K', '$50K - $100K', '> $100K'].map((volume) => (
                    <Button
                      key={volume}
                      variant={profileData.monthlyVolume === volume ? 'default' : 'outline'}
                      onClick={() => setProfileData({...profileData, monthlyVolume: volume})}
                      className="justify-center"
                    >
                      {volume}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#0B1220] mb-2">Data Setup</h2>
              <p className="text-[#6B7280]">Choose how you want to import your trading data</p>
            </div>
            
            <div className="grid gap-4">
              <Card className="border-2 border-[#2563EB] bg-[#F0F9FF]">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <FileSpreadsheet className="h-8 w-8 text-[#2563EB] mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0B1220] mb-2">CSV Import (Recommended)</h3>
                      <p className="text-sm text-[#6B7280] mb-4">
                        Import your trading data from a CSV file. Works with most brokers including 
                        Interactive Brokers, TD Ameritrade, and more.
                      </p>
                      <Badge className="bg-[#16A34A] text-white">Most Popular</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E5E7EB]">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Target className="h-8 w-8 text-[#7C3AED] mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0B1220] mb-2">Manual Entry</h3>
                      <p className="text-sm text-[#6B7280] mb-4">
                        Add trades manually one by one. Perfect for getting started or 
                        for traders with low volume.
                      </p>
                      <Badge variant="outline">Simple Setup</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E5E7EB]">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <DollarSign className="h-8 w-8 text-[#16A34A] mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0B1220] mb-2">API Integration</h3>
                      <p className="text-sm text-[#6B7280] mb-4">
                        Connect directly to your broker&apos;s API for real-time data sync. 
                        Available for supported brokers.
                      </p>
                      <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B]">Coming Soon</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="h-16 w-16 text-[#16A34A] mx-auto" />
            <h2 className="text-2xl font-bold text-[#0B1220]">You&apos;re All Set!</h2>
            <p className="text-lg text-[#6B7280] max-w-md mx-auto">
              Your Trade Voyager dashboard is ready. Start by importing your first trades 
              or exploring the demo data to see how everything works.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-lg mx-auto">
              <Card className="p-4 border-[#E5E7EB]">
                <h3 className="font-semibold text-[#0B1220] mb-2">Import Data</h3>
                <p className="text-sm text-[#6B7280]">Upload your trading history</p>
              </Card>
              <Card className="p-4 border-[#E5E7EB]">
                <h3 className="font-semibold text-[#0B1220] mb-2">View Dashboard</h3>
                <p className="text-sm text-[#6B7280]">Explore your analytics</p>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F7FB] via-[#FFFFFF] to-[#E5E7EB]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index <= currentStep 
                    ? 'bg-[#2563EB] border-[#2563EB] text-white' 
                    : 'border-[#E5E7EB] text-[#6B7280]'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 ml-2 ${
                    index < currentStep ? 'bg-[#2563EB]' : 'bg-[#E5E7EB]'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-[#6B7280]">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white border-[#E5E7EB] shadow-lg">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
          >
            Skip for now
          </Button>
          <Button 
            onClick={handleNext}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          >
            {currentStep === steps.length - 1 ? 'Go to Dashboard' : 'Continue'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}