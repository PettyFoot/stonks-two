'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentHistory } from '@/components/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier } from '@prisma/client';
import {
  CreditCard,
  Plus,
  Receipt,
  DollarSign,
  FileText,
  Loader2
} from 'lucide-react';

// Mock payment method data - replace with actual data
const paymentMethods = [
  {
    id: 'pm_1',
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
    isDefault: true
  }
];

// Mock billing information
const billingInfo = {
  nextBillingDate: '2024-01-15',
  amount: 29.99,
  currency: 'USD',
  billingCycle: 'monthly',
  tax: 2.40,
  total: 32.39
};

export default function BillingTab() {
  const { subscription, isLoading, createCheckoutSession, createBillingPortalSession } = useSubscription();
  const [isAddingCard, setIsAddingCard] = useState(false);

  const handleAddPaymentMethod = () => {
    setIsAddingCard(true);
    // TODO: Integrate with Stripe or payment processor
    console.log('Adding payment method...');
  };

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

  const handleRemovePaymentMethod = (id: string) => {
    // TODO: Implement payment method removal
    console.log('Removing payment method:', id);
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    // TODO: Implement invoice download
    console.log('Downloading invoice:', invoiceId);
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
              <div>
                <h4 className="font-semibold">
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isPremium 
                    ? subscription?.priceText || 'Monthly billing'
                    : 'No billing required'
                  }
                </p>
                {isPremium && subscription?.daysRemaining && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscription.inTrial 
                      ? `Trial ends in ${subscription.daysRemaining} days`
                      : `Renews in ${subscription.daysRemaining} days`
                    }
                  </p>
                )}
              </div>
              <Badge variant={isPremium ? "default" : "secondary"}>
                {subscription?.statusText || 'Free'}
              </Badge>
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

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            {isPremium && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Manage Methods
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isPremium ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Manage payment methods in billing portal</p>
                <p className="text-sm mb-4">Update cards, billing address, and payment preferences</p>
                <Button onClick={handleManageBilling} variant="outline" size="sm">
                  Open Billing Portal
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment methods on file</p>
                <p className="text-sm">Upgrade to Premium to manage payment methods</p>
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Billing Address</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>No billing address on file</p>
                  <p>Add a billing address when you upgrade</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tax Information</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Tax ID: Not provided</p>
                  <p>Business Name: Not provided</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Invoice Preferences</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  Email invoices to my account email
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Send billing reminders
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Include detailed usage reports
                </label>
              </div>
            </div>
          </div>
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
            <Button variant="outline">Contact Billing Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}