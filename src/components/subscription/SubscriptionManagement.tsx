'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionStatus } from './SubscriptionStatus';
import { SubscriptionTier, SubscriptionStatus as Status } from '@prisma/client';
import { 
  Crown, 
  CreditCard, 
  Settings, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  Download,
  RefreshCw,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionManagementProps {
  className?: string;
}

export function SubscriptionManagement({ className }: SubscriptionManagementProps) {
  const {
    subscription,
    isLoading,
    error,
    hasPremiumAccess,
    createCheckoutSession,
    cancelSubscription,
    reactivateSubscription,
    createBillingPortalSession,
    refreshSubscription
  } = useSubscription();

  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const handleAction = async (action: string, actionFn: () => Promise<any>) => {
    setActionLoading(action);
    try {
      const result = await actionFn();
      
      if (action === 'upgrade' || action === 'billing') {
        if (result.url) {
          window.location.href = result.url;
        } else if (result.error) {
          console.error(`${action} error:`, result.error);
        }
      } else if (!result.success && result.error) {
        console.error(`${action} error:`, result.error);
      }
    } catch (error) {
      console.error(`${action} error:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgrade = () => handleAction('upgrade', createCheckoutSession);
  const handleCancel = () => handleAction('cancel', cancelSubscription);
  const handleReactivate = () => handleAction('reactivate', reactivateSubscription);
  const handleBilling = () => handleAction('billing', createBillingPortalSession);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading subscription details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Subscription Management
              </CardTitle>
              <CardDescription>
                Manage your subscription, billing, and premium features
              </CardDescription>
            </div>
            <Button
              onClick={refreshSubscription}
              variant="ghost"
              size="sm"
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Current Plan */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {subscription?.tier === SubscriptionTier.PREMIUM && (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      )}
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {subscription?.tier === SubscriptionTier.PREMIUM ? 'Premium' : 'Free'}
                        </span>
                        <Badge variant={hasPremiumAccess ? 'default' : 'secondary'}>
                          {subscription?.statusText || 'Free'}
                        </Badge>
                      </div>
                      
                      {subscription && (
                        <div className="text-sm text-muted-foreground">
                          {subscription.priceText}
                        </div>
                      )}
                    </div>

                    <SubscriptionStatus showProgress showDetails={false} compact />
                  </CardContent>
                </Card>

                {/* Next Billing */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Next Billing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscription && subscription.daysRemaining > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>{subscription.inTrial ? 'Trial ends' : 'Renews'}</span>
                          <span className="font-medium">
                            {subscription.daysRemaining} days
                          </span>
                        </div>
                        
                        {subscription.willCancel && (
                          <div className="flex items-center gap-1 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            Will not auto-renew
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {subscription?.tier === SubscriptionTier.PREMIUM 
                          ? 'No active billing cycle' 
                          : 'No billing scheduled'
                        }
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Feature Access */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feature Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FeatureItem 
                      feature="Trade Imports" 
                      available={true}
                      description={hasPremiumAccess ? 'Unlimited' : 'Up to 100/month'}
                    />
                    <FeatureItem 
                      feature="Advanced Analytics" 
                      available={hasPremiumAccess}
                      description="Detailed performance metrics"
                    />
                    <FeatureItem 
                      feature="Data Export" 
                      available={hasPremiumAccess}
                      description="CSV/JSON export capabilities"
                    />
                    <FeatureItem 
                      feature="Priority Support" 
                      available={hasPremiumAccess}
                      description="Email support with priority handling"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscription ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Current Plan</label>
                          <p className="text-sm text-muted-foreground">
                            {subscription.tier === SubscriptionTier.PREMIUM ? 'Premium' : 'Free'} Plan
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Amount</label>
                          <p className="text-sm text-muted-foreground">
                            {subscription.priceText}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleBilling}
                        disabled={actionLoading !== null}
                        variant="outline"
                        className="w-full"
                      >
                        {actionLoading === 'billing' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Manage Billing & Payment Methods
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No billing information available</p>
                      <p className="text-sm">Upgrade to Premium to manage billing</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subscription Actions</CardTitle>
                  <CardDescription>
                    Manage your subscription settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!hasPremiumAccess ? (
                    // Upgrade Section
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-3 mb-3">
                          <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                          <h3 className="font-medium">Upgrade to Premium</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get unlimited access to all features with a 14-day free trial
                        </p>
                        <Button onClick={handleUpgrade} disabled={actionLoading !== null}>
                          {actionLoading === 'upgrade' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating checkout...
                            </>
                          ) : (
                            <>
                              <Crown className="mr-2 h-4 w-4" />
                              Start Free Trial
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Premium Management
                    <div className="space-y-4">
                      {subscription?.willCancel ? (
                        <div className="p-4 bg-green-50 dark:bg-green-950/10 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <h3 className="font-medium">Reactivate Subscription</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Your subscription is set to cancel. Reactivate to continue Premium access.
                          </p>
                          <Button 
                            onClick={handleReactivate}
                            disabled={actionLoading !== null}
                            variant="default"
                          >
                            {actionLoading === 'reactivate' ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Reactivating...
                              </>
                            ) : (
                              'Reactivate Subscription'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 dark:bg-red-950/10 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <h3 className="font-medium">Cancel Subscription</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Cancel your subscription. You'll retain access until the end of your billing period.
                          </p>
                          <Button 
                            onClick={handleCancel}
                            disabled={actionLoading !== null}
                            variant="destructive"
                          >
                            {actionLoading === 'cancel' ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Canceling...
                              </>
                            ) : (
                              'Cancel Subscription'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface FeatureItemProps {
  feature: string;
  available: boolean;
  description: string;
}

function FeatureItem({ feature, available, description }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "flex-shrink-0 mt-0.5 rounded-full p-1",
        available ? "text-green-600 dark:text-green-400" : "text-gray-400"
      )}>
        {available ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm font-medium",
          available ? "text-foreground" : "text-muted-foreground"
        )}>
          {feature}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}