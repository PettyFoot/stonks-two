'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { Crown, Clock, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionBadgeProps {
  variant?: 'default' | 'detailed' | 'icon-only' | 'compact';
  showIcon?: boolean;
  className?: string;
}

export function SubscriptionBadge({ 
  variant = 'default', 
  showIcon = true,
  className 
}: SubscriptionBadgeProps) {
  const { subscription, isLoading, hasPremiumAccess } = useSubscription();

  const getStatusIcon = () => {
    if (!subscription) return <XCircle className="h-3 w-3" />;
    
    switch (subscription.status) {
      case SubscriptionStatus.ACTIVE:
        return subscription.willCancel 
          ? <AlertTriangle className="h-3 w-3" />
          : <CheckCircle className="h-3 w-3" />;
      case SubscriptionStatus.TRIALING:
        return <Clock className="h-3 w-3" />;
      case SubscriptionStatus.PAST_DUE:
      case SubscriptionStatus.UNPAID:
        return <AlertTriangle className="h-3 w-3" />;
      case SubscriptionStatus.CANCELED:
        return <XCircle className="h-3 w-3" />;
      default:
        return <XCircle className="h-3 w-3" />;
    }
  };

  const getBadgeVariant = () => {
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

  const getBadgeText = () => {
    if (!subscription) return 'Free';
    
    switch (variant) {
      case 'detailed':
        if (subscription.willCancel) {
          return `${subscription.statusText} (${subscription.daysRemaining}d left)`;
        }
        return subscription.statusText;
      
      case 'icon-only':
        return '';
      
      case 'compact':
        if (subscription.tier === SubscriptionTier.PREMIUM) {
          return subscription.inTrial ? 'Trial' : 'Pro';
        }
        return 'Free';
      
      default:
        return subscription.statusText;
    }
  };

  const getPremiumIcon = () => {
    if (subscription?.tier === SubscriptionTier.PREMIUM) {
      return <Crown className="h-3 w-3 text-yellow-500" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <Badge variant="secondary" className={className}>
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Loading...
      </Badge>
    );
  }

  if (variant === 'icon-only') {
    return (
      <div className={cn("inline-flex items-center", className)}>
        {showIcon && (
          <>
            {getPremiumIcon()}
            {getStatusIcon()}
          </>
        )}
      </div>
    );
  }

  const badgeContent = (
    <>
      {showIcon && (
        <>
          {getPremiumIcon()}
          {getStatusIcon()}
        </>
      )}
      {getBadgeText()}
    </>
  );

  return (
    <Badge 
      variant={getBadgeVariant()}
      className={cn(
        "gap-1",
        variant === 'compact' && "text-xs px-2 py-0.5",
        className
      )}
      role="status"
      aria-label={`Subscription status: ${getBadgeText()}`}
    >
      {badgeContent}
    </Badge>
  );
}

// Specific badge variants for common use cases
export function PremiumBadge({ className, ...props }: Omit<SubscriptionBadgeProps, 'variant'>) {
  const { hasPremiumAccess } = useSubscription();
  
  if (!hasPremiumAccess) return null;
  
  return (
    <Badge 
      variant="default"
      className={cn("gap-1 text-yellow-100 bg-gradient-to-r from-yellow-600 to-orange-600", className)}
      {...props}
    >
      <Crown className="h-3 w-3" />
      Premium
    </Badge>
  );
}

export function TrialBadge({ className, ...props }: Omit<SubscriptionBadgeProps, 'variant'>) {
  const { subscription } = useSubscription();
  
  if (!subscription?.inTrial) return null;
  
  return (
    <Badge 
      variant="secondary"
      className={cn("gap-1", className)}
      {...props}
    >
      <Clock className="h-3 w-3" />
      Trial ({subscription.daysRemaining}d left)
    </Badge>
  );
}

export function StatusBadge({ 
  status, 
  className, 
  ...props 
}: { 
  status: 'active' | 'trial' | 'expired' | 'canceled';
  className?: string;
}) {
  const getVariant = () => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'expired': return 'destructive';
      case 'canceled': return 'outline';
      default: return 'secondary';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'trial': return <Clock className="h-3 w-3" />;
      case 'expired': return <AlertTriangle className="h-3 w-3" />;
      case 'canceled': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getText = () => {
    switch (status) {
      case 'active': return 'Active';
      case 'trial': return 'Trial';
      case 'expired': return 'Expired';
      case 'canceled': return 'Canceled';
      default: return 'Unknown';
    }
  };

  return (
    <Badge 
      variant={getVariant()}
      className={cn("gap-1", className)}
      {...props}
    >
      {getIcon()}
      {getText()}
    </Badge>
  );
}