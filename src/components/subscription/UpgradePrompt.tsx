'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  Crown, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  X,
  Zap,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  title?: string;
  description?: string;
  feature?: string;
  benefits?: string[];
  variant?: 'card' | 'banner' | 'modal' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  showClose?: boolean;
  onClose?: () => void;
  onUpgrade?: () => Promise<void>;
  className?: string;
}

const DEFAULT_BENEFITS = [
  'Unlimited trade imports',
  'Advanced analytics',
  'Export capabilities',
  'Priority support'
];

export function UpgradePrompt({
  title = 'Upgrade to Premium',
  description = 'Unlock advanced features and unlimited access',
  feature,
  benefits = DEFAULT_BENEFITS,
  variant = 'card',
  size = 'md',
  showClose = false,
  onClose,
  onUpgrade,
  className
}: UpgradePromptProps) {
  const { createCheckoutSession, hasPremiumAccess, isLoading } = useSubscription();
  const [actionLoading, setActionLoading] = React.useState(false);

  // Don't show upgrade prompt to premium users
  if (hasPremiumAccess) {
    return null;
  }

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      if (onUpgrade) {
        await onUpgrade();
      } else {
        const result = await createCheckoutSession();
        if (result.url) {
          window.location.href = result.url;
        } else if (result.error) {
          console.error('Upgrade error:', result.error);
        }
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-sm p-3',
    md: '',
    lg: 'p-6'
  };

  // Banner variant
  if (variant === 'banner') {
    return (
      <div 
        className={cn(
          "relative bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4",
          sizeClasses[size],
          className
        )}
        role="banner"
        aria-label="Premium upgrade prompt"
      >
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-yellow-200/50 dark:hover:bg-yellow-800/50"
            aria-label="Close upgrade prompt"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature ? `Unlock ${feature} with Premium` : description}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleUpgrade}
            disabled={isLoading || actionLoading}
            size="sm"
            className="shrink-0"
          >
            {actionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crown className="mr-2 h-4 w-4" />
            )}
            Upgrade
          </Button>
        </div>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div 
        className={cn(
          "flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">
            {feature ? `${feature} requires Premium` : title}
          </span>
        </div>
        
        <Button 
          onClick={handleUpgrade}
          disabled={isLoading || actionLoading}
          size="sm"
          variant="outline"
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Upgrade
              <ArrowRight className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card 
      className={cn(
        "relative overflow-hidden",
        size === 'lg' && "max-w-md",
        className
      )}
      role="region"
      aria-label="Premium upgrade offer"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/5 dark:to-orange-950/5" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-100/20 to-transparent dark:from-yellow-900/10 rounded-full -translate-y-16 translate-x-16" />
      
      {showClose && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-background/50 backdrop-blur-sm"
          aria-label="Close upgrade prompt"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <CardHeader className={cn("relative z-10 text-center", showClose && "pr-12")}>
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full">
            <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <CardTitle className="flex items-center justify-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        
        <CardDescription>
          {feature ? `Unlock ${feature} and get access to all premium features` : description}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">What you&apos;ll get:</h4>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleUpgrade}
            disabled={isLoading || actionLoading}
            className="w-full"
            size={size === "md" ? "default" : size}
          >
            {actionLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating checkout...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Start Free Trial - $9.99/month
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            14-day free trial • Cancel anytime • No commitment
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Specific upgrade prompt variants
export function FeatureUpgradePrompt({ 
  featureName, 
  className,
  ...props 
}: Omit<UpgradePromptProps, 'feature' | 'title'> & { 
  featureName: string 
}) {
  return (
    <UpgradePrompt
      title={`${featureName} is a Premium Feature`}
      feature={featureName}
      variant="card"
      className={className}
      {...props}
    />
  );
}

export function QuickUpgradeBanner(props: Omit<UpgradePromptProps, 'variant'>) {
  return (
    <UpgradePrompt
      variant="banner"
      size="sm"
      {...props}
    />
  );
}

export function InlineUpgradePrompt(props: Omit<UpgradePromptProps, 'variant'>) {
  return (
    <UpgradePrompt
      variant="inline"
      {...props}
    />
  );
}