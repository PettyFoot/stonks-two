'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier, SubscriptionStatus as Status } from '@prisma/client';
import { 
  Crown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Calendar,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionStatusProps {
  showProgress?: boolean;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function SubscriptionStatus({ 
  showProgress = false, 
  showDetails = true,
  compact = false,
  className 
}: SubscriptionStatusProps) {
  const { subscription, isLoading, hasPremiumAccess } = useSubscription();

  const getStatusIcon = () => {
    if (!subscription) return <XCircle className="h-4 w-4" />;
    
    switch (subscription.status) {
      case Status.ACTIVE:
        return subscription.willCancel 
          ? <AlertTriangle className="h-4 w-4" />
          : <CheckCircle className="h-4 w-4" />;
      case Status.TRIALING:
        return <Clock className="h-4 w-4" />;
      case Status.PAST_DUE:
      case Status.UNPAID:
        return <AlertTriangle className="h-4 w-4" />;
      case Status.CANCELED:
        return <XCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    if (!subscription) return 'secondary';

    switch (subscription.status) {
      case Status.ACTIVE:
        if (subscription.willCancel) return 'destructive';
        // Highlight Premium in green, keep others as secondary
        return subscription.tier === SubscriptionTier.PREMIUM && !subscription.inTrial ? 'default' : 'secondary';
      case Status.TRIALING:
        // Only highlight Premium trial in green, not Free Trial
        return subscription.tier === SubscriptionTier.PREMIUM ? 'default' : 'secondary';
      case Status.PAST_DUE:
      case Status.UNPAID:
        return 'destructive';
      case Status.CANCELED:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (!subscription) return 'Free';

    if (subscription.willCancel) {
      return `Cancels in ${subscription.daysRemaining} days`;
    }

    switch (subscription.status) {
      case Status.ACTIVE:
        if (subscription.tier === SubscriptionTier.PREMIUM) {
          return subscription.inTrial ? 'Free Trial' : 'Premium';
        }
        return subscription.inTrial ? 'Free Trial' : 'Active';
      case Status.TRIALING:
        return subscription.tier === SubscriptionTier.PREMIUM ? 'Free Trial' : 'Free Trial';
      case Status.PAST_DUE:
        return 'Payment Due';
      case Status.UNPAID:
        return 'Payment Failed';
      case Status.CANCELED:
        return 'Canceled';
      default:
        return 'Free';
    }
  };

  const getTrialProgress = () => {
    if (!subscription?.inTrial) return 0;
    const totalDays = 14; // Assuming 14-day trial
    const remainingDays = subscription.daysRemaining;
    const completedDays = Math.max(0, totalDays - remainingDays);
    return Math.min(100, (completedDays / totalDays) * 100);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Subscription status">
      <div className="flex items-center gap-2">
        {subscription?.tier === SubscriptionTier.PREMIUM && (
          <Crown className="h-4 w-4 text-yellow-500" aria-hidden="true" />
        )}

        {/* Show Premium first if user has premium tier */}
        {subscription?.tier === SubscriptionTier.PREMIUM && (
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className={cn("gap-1 bg-green-100 text-green-800 hover:bg-green-200 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800", compact && "text-xs")}
            >
              Premium
            </Badge>
            {subscription?.inTrial && (
              <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                Free Trial
              </span>
            )}
          </div>
        )}

        {/* Show regular status for non-premium users */}
        {subscription?.tier !== SubscriptionTier.PREMIUM && (
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <Badge
              variant={getStatusColor()}
              className={cn("gap-1", compact && "text-xs")}
            >
              {getStatusText()}
            </Badge>
          </div>
        )}
      </div>

      {showDetails && !compact && subscription && subscription.daysRemaining > 0 && (
        <div className="text-xs text-muted-foreground">
          <span>
            {subscription.inTrial ? 'Trial ends' : 'Renews'} in {subscription.daysRemaining} days
          </span>
        </div>
      )}

      {showProgress && subscription?.inTrial && (
        <div className="space-y-1" role="progressbar" aria-label="Trial progress">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Trial Progress</span>
            <span className="font-medium">
              {14 - subscription.daysRemaining} / 14 days
            </span>
          </div>
          <Progress 
            value={getTrialProgress()} 
            className="h-2"
            aria-label={`Trial progress: ${Math.round(getTrialProgress())}% complete`}
          />
        </div>
      )}

      {subscription?.status === Status.PAST_DUE && (
        <div className="flex items-center gap-1 text-xs text-destructive" role="alert">
          <AlertTriangle className="h-3 w-3" />
          <span>Please update your payment method to continue</span>
        </div>
      )}

      {subscription?.willCancel && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Subscription will not auto-renew</span>
        </div>
      )}
    </div>
  );
}