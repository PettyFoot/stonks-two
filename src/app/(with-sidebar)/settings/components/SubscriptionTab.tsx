'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TrendingUp,
  Settings as SettingsIcon,
  Loader2
} from 'lucide-react';


function SubscriptionTabInternal() {
  const { subscription, isLoading } = useSubscription();

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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Plan Status */}
            <SubscriptionStatus />

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
          <PricingCards />
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