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
        return subscription.willCancel ? 'destructive' : 'default';
      case Status.TRIALING:
        return 'secondary';
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
        return subscription.inTrial ? 'Free Trial' : 'Active';
      case Status.TRIALING:
        return 'Free Trial';
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
        
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <Badge 
            variant={getStatusColor()}
            className={cn("gap-1", compact && "text-xs")}
          >
            {getStatusText()}
          </Badge>
        </div>

        {subscription?.tier === SubscriptionTier.PREMIUM && !compact && (
          <span className="text-sm font-medium">Premium</span>
        )}
      </div>

      {showDetails && !compact && subscription && (
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <span>{subscription.priceText}</span>
          </div>
          
          {subscription.daysRemaining > 0 && (
            <div>
              <span>
                {subscription.inTrial ? 'Trial ends' : 'Renews'} in {subscription.daysRemaining} days
              </span>
            </div>
          )}
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