'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InlineTriangleLoader } from '@/components/ui/TriangleLoader';
import { CheckCircle, ArrowRight, X, Sparkles, TrendingUp, Database } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: string; // What triggered the upgrade prompt
}

export function UpgradePrompt({ 
  isOpen, 
  onClose,
  trigger = 'general'
}: UpgradePromptProps) {
  const { isDemo } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (!isDemo) return null;

  const handleUpgrade = async () => {
    setIsTransitioning(true);
    
    try {
      // Save demo session state to transfer after signup
      await fetch('/api/demo/prepare-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPage: window.location.pathname,
          filters: localStorage.getItem('demo_filters'),
          trigger
        })
      });

      // Redirect to signup with special demo upgrade flow
      window.location.href = '/api/auth/signup?upgrade=demo&preserve=true';
    } catch (error) {
      console.error('Error preparing upgrade:', error);
      // Still redirect to signup even if preparation fails
      window.location.href = '/api/auth/signup?upgrade=demo';
    }
  };

  const benefits = [
    {
      icon: Database,
      title: 'Import unlimited trades',
      subtitle: 'From any broker or platform'
    },
    {
      icon: TrendingUp,
      title: 'Advanced analytics',
      subtitle: 'Detailed performance metrics'
    },
    {
      icon: Sparkles,
      title: 'Full editing capabilities',
      subtitle: 'Modify trades and add notes'
    },
    {
      icon: ArrowRight,
      title: 'Export your data',
      subtitle: 'Download reports anytime'
    }
  ];

  const triggerMessages = {
    upload: 'Import your own trading data',
    edit: 'Start editing and managing your trades',
    export: 'Download your trading reports',
    general: 'Unlock the full trading analytics platform'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Ready to Track Real Trades?
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-gray-600">
              You&apos;ve been exploring with sample data. {triggerMessages[trigger as keyof typeof triggerMessages] || triggerMessages.general}.
            </p>
          </div>

          <div className="space-y-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <span className="font-medium">{benefit.title}</span>
                  <p className="text-sm text-gray-500">{benefit.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 space-y-3">
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={handleUpgrade}
              disabled={isTransitioning}
            >
              {isTransitioning ? (
                <>
                  <InlineTriangleLoader size="sm" />
                  <span className="ml-2">Setting up your account...</span>
                </>
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={onClose}
            >
              Continue Exploring Demo
            </Button>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">
              No credit card required • 14-day free trial
            </p>
            <p className="text-xs text-gray-400">
              Your demo session will be preserved during signup
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to easily trigger upgrade prompts
export function useUpgradePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [trigger, setTrigger] = useState('general');

  const showUpgrade = (triggerType: string = 'general') => {
    setTrigger(triggerType);
    setIsOpen(true);
  };

  const hideUpgrade = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    trigger,
    showUpgrade,
    hideUpgrade,
    UpgradePrompt: () => (
      <UpgradePrompt 
        isOpen={isOpen} 
        onClose={hideUpgrade} 
        trigger={trigger} 
      />
    )
  };
}