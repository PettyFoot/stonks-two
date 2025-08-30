'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SubscriptionManagement,
  PricingCards,
  SubscriptionStatus,
  UpgradePrompt
} from '@/components/subscription';
import { SubscriptionErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier } from '@prisma/client';
import {
  Crown,
  Zap,
  TrendingUp,
  BarChart3,
  Settings as SettingsIcon,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';


const planFeatures = {
  free: [
    { name: 'Up to 50 trades per month', included: true },
    { name: 'Basic reports', included: true },
    { name: 'Standard dashboard', included: true },
    { name: 'CSV export', included: false },
    { name: 'Advanced analytics', included: false },
    { name: 'Priority support', included: false },
    { name: 'Custom reports', included: false }
  ],
  pro: [
    { name: 'Unlimited trades', included: true },
    { name: 'Advanced reports', included: true },
    { name: 'Premium dashboard', included: true },
    { name: 'CSV & PDF export', included: true },
    { name: 'Advanced analytics', included: true },
    { name: 'Priority support', included: true },
    { name: 'Custom reports', included: true }
  ]
};

function SubscriptionTabInternal() {
  const { subscription, isLoading, hasPremiumAccess, createCheckoutSession } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading subscription...</p>
        </div>
      </div>
    );
  }

  const currentTier = subscription?.tier || SubscriptionTier.FREE;
  const isFree = currentTier === SubscriptionTier.FREE;
  const isPremium = currentTier === SubscriptionTier.PREMIUM;
  const tierKey = isFree ? 'free' : 'pro';

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <Badge variant={isFree ? 'secondary' : 'default'}>
              {isFree ? 'Free' : 'Premium'} Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Plan Status */}
            <SubscriptionStatus />
            
            {/* Plan Features Comparison */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Your Current Features</h4>
              <div className="space-y-3">
                {planFeatures[tierKey].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade Prompt for Free Users */}
            {isFree && (
              <div className="mt-6">
                <UpgradePrompt
                  feature="unlimited trades and advanced analytics"
                  context="settings"
                  className="border-2 border-primary/20"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      {isPremium && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Manage Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionManagement />
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Available Plans
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Choose the plan that best fits your trading needs
          </p>
        </CardHeader>
        <CardContent>
          <PricingCards 
            currentTier={currentTier}
            showComparison={true}
          />
        </CardContent>
      </Card>

      {/* Feature Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pro Plan Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Unlimited Trades</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Track unlimited trades without monthly limits
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Advanced Analytics</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Access detailed performance metrics and insights
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Custom Reports</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate customized reports for tax and analysis
              </p>
            </div>
          </div>

          {isFree && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-primary">Ready to upgrade?</h4>
                  <p className="text-sm text-muted-foreground">
                    Get access to all Pro features with a 14-day free trial
                  </p>
                </div>
                <Button 
                  className="flex items-center gap-2"
                  onClick={async () => {
                    const result = await createCheckoutSession();
                    if (result.url) {
                      window.location.href = result.url;
                    }
                  }}
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Can I cancel my subscription anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. You&apos;ll continue to have access 
                to Pro features until the end of your billing period.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">What happens to my data if I downgrade?</h4>
              <p className="text-sm text-muted-foreground">
                Your data is never deleted. However, some features may become unavailable 
                and you&apos;ll be subject to plan limits.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Do you offer refunds?</h4>
              <p className="text-sm text-muted-foreground">
                We offer a 14-day money-back guarantee for all new subscriptions. 
                Contact support if you need assistance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export wrapped with error boundary
export default function SubscriptionTab() {
  return (
    <SubscriptionErrorBoundary onError={(error, errorInfo) => {
      console.error('[SubscriptionTab] Error occurred:', error, errorInfo);
    }}>
      <SubscriptionTabInternal />
    </SubscriptionErrorBoundary>
  );
}