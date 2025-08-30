'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { Loader2, Crown, CreditCard, Settings, AlertTriangle } from 'lucide-react';
import { SubscriptionErrorBoundary } from '@/components/ui/ErrorBoundary';

interface SubscriptionCardProps {
  showUpgradeButton?: boolean;
  showManagementButtons?: boolean;
  compact?: boolean;
}

function SubscriptionCardInternal({ 
  showUpgradeButton = true, 
  showManagementButtons = true,
  compact = false 
}: SubscriptionCardProps) {
  const {
    subscription,
    isLoading,
    error,
    createCheckoutSession,
    cancelSubscription,
    reactivateSubscription,
    createBillingPortalSession,
    hasPremiumAccess,
  } = useSubscription();

  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const handleUpgrade = async () => {
    setActionLoading('upgrade');
    try {
      const result = await createCheckoutSession();
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        console.error('Upgrade error:', result.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading('cancel');
    try {
      const result = await cancelSubscription();
      if (!result.success && result.error) {
        console.error('Cancel error:', result.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Cancel error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    try {
      const result = await reactivateSubscription();
      if (!result.success && result.error) {
        console.error('Reactivate error:', result.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Reactivate error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading('billing');
    try {
      const result = await createBillingPortalSession();
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        console.error('Billing portal error:', result.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Billing portal error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !subscription) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center gap-2 text-red-600 py-4">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load subscription information</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPremium = subscription?.tier === SubscriptionTier.PREMIUM;
  const isActive = hasPremiumAccess;

  const getStatusBadgeVariant = () => {
    if (!subscription) return 'secondary';
    
    switch (subscription.status) {
      case SubscriptionStatus.ACTIVE:
        return subscription.willCancel ? 'destructive' : 'default';
      case SubscriptionStatus.TRIALING:
        return 'secondary';
      case SubscriptionStatus.PAST_DUE:
      case SubscriptionStatus.UNPAID:
        return 'destructive';
      case SubscriptionStatus.CANCELED:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className={compact ? "p-4" : ""}>
      <CardHeader className={compact ? "p-0 pb-4" : ""}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPremium && <Crown className="h-5 w-5 text-yellow-500" />}
            <CardTitle className={compact ? "text-lg" : ""}>
              {isPremium ? 'Premium' : 'Free'} Plan
            </CardTitle>
          </div>
          <Badge variant={getStatusBadgeVariant()}>
            {subscription?.statusText || 'Free'}
          </Badge>
        </div>
        
        {!compact && (
          <CardDescription>
            {isPremium 
              ? 'Full access to all premium features and unlimited trades'
              : 'Limited access to basic features'
            }
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={compact ? "p-0" : ""}>
        <div className="space-y-4">
          {/* Subscription Details */}
          {subscription && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Price</p>
                <p className="text-muted-foreground">{subscription.priceText}</p>
              </div>
              
              {subscription.daysRemaining > 0 && (
                <div>
                  <p className="font-medium">
                    {subscription.inTrial ? 'Trial Ends' : 'Renews'}
                  </p>
                  <p className="text-muted-foreground">
                    {subscription.daysRemaining} days
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {/* Upgrade Button */}
            {!isPremium && showUpgradeButton && (
              <Button 
                onClick={handleUpgrade}
                disabled={actionLoading !== null}
                className="w-full"
              >
                {actionLoading === 'upgrade' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating checkout...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Premium
                  </>
                )}
              </Button>
            )}

            {/* Management Buttons for Premium Users */}
            {isPremium && showManagementButtons && (
              <div className="flex flex-col gap-2">
                {/* Cancel/Reactivate */}
                {subscription?.willCancel ? (
                  <Button 
                    onClick={handleReactivate}
                    disabled={actionLoading !== null}
                    variant="default"
                    className="w-full"
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
                ) : (
                  <Button 
                    onClick={handleCancel}
                    disabled={actionLoading !== null}
                    variant="outline"
                    className="w-full"
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
                )}

                {/* Billing Portal */}
                <Button 
                  onClick={handleManageBilling}
                  disabled={actionLoading !== null}
                  variant="ghost"
                  className="w-full"
                >
                  {actionLoading === 'billing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Billing
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Billing Management for Free Users with Past Subscriptions */}
            {!isActive && subscription?.tier === SubscriptionTier.PREMIUM && (
              <Button 
                onClick={handleManageBilling}
                disabled={actionLoading !== null}
                variant="ghost"
                className="w-full"
              >
                {actionLoading === 'billing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    View Billing History
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export wrapped with error boundary
export function SubscriptionCard(props: SubscriptionCardProps) {
  return (
    <SubscriptionErrorBoundary onError={(error, errorInfo) => {
      console.error('[SubscriptionCard] Error occurred:', error, errorInfo);
    }}>
      <SubscriptionCardInternal {...props} />
    </SubscriptionErrorBoundary>
  );
}