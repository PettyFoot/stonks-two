'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PaymentHistory } from '@/components/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { BillingInformationForm } from './BillingInformationForm';
import { SubscriptionTier } from '@prisma/client';
import {
  Receipt,
  DollarSign,
  FileText,
  Loader2
} from 'lucide-react';

export default function BillingTab() {
  const { subscription, isLoading, createCheckoutSession, createBillingPortalSession } = useSubscription();

  const handleUpgradeClick = async () => {
    const result = await createCheckoutSession();
    if (result.url) {
      window.location.href = result.url;
    }
  };

  const handleManageBilling = async () => {
    const result = await createBillingPortalSession();
    if (result.url) {
      window.location.href = result.url;
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const subscriptionTier = subscription?.tier || SubscriptionTier.FREE;
  const isFree = subscriptionTier === SubscriptionTier.FREE;
  const isPremium = subscriptionTier === SubscriptionTier.PREMIUM;

  return (
    <div className="space-y-6">
      {/* Current Plan Billing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Current Billing
            </CardTitle>
            {isPremium && (
              <Button onClick={handleManageBilling} variant="outline" size="sm">
                Manage Billing
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-semibold">
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isPremium
                    ? subscription?.priceText || '$9.99/month'
                    : 'No billing required'
                  }
                </p>
                {isPremium && subscription && subscription.daysRemaining && subscription.daysRemaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscription.inTrial
                      ? `Trial (${subscription.daysRemaining} days remaining)`
                      : `Renews in ${subscription.daysRemaining} days`
                    }
                  </p>
                )}
              </div>

              {isPremium && (
                <div className="flex flex-col items-center gap-2 mx-4">
                  <Button
                    onClick={handleManageBilling}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    Update Payment Method
                  </Button>
                </div>
              )}

              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isPremium ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}>
                {subscription?.statusText || 'Free'}
              </span>
            </div>
            
            {isFree && (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  You&apos;re currently on the free plan. Upgrade to Premium to unlock advanced features.
                </p>
                <Button onClick={handleUpgradeClick}>Upgrade to Premium</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentHistory />
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BillingInformationForm />
        </CardContent>
      </Card>

      {/* Billing FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">When will I be charged?</h4>
              <p className="text-sm text-muted-foreground">
                Billing occurs on the same day each month/year based on when you first subscribed. 
                You&apos;ll receive an email notification 3 days before each billing date.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. 
                All payments are processed securely through Stripe.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Can I get a receipt for my subscription?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You&apos;ll receive an email receipt for every payment. You can also download 
                PDF invoices from your billing history above.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">What happens if my payment fails?</h4>
              <p className="text-sm text-muted-foreground">
                We&apos;ll attempt to charge your payment method 3 times over 7 days. If all attempts fail, 
                your account will be downgraded to the free plan until payment is resolved.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Have questions about billing or need to update your payment information?
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Billing Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}