'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  Crown, 
  Check, 
  Loader2,
  Sparkles,
  TrendingUp,
  Database,
  Download,
  HeadphonesIcon,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingTier {
  id: 'free' | 'premium';
  name: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
}

interface PricingCardProps {
  tier: PricingTier;
  onUpgrade?: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    billing: 'forever',
    description: 'Perfect for getting started with basic trading analytics',
    features: [
      'Full platform access',
      'All analytics features',
      'No credit card required',
      '10 API calls per minute',
      '10 uploads per day'
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    billing: 'per month',
    description: 'Complete trading analytics suite for serious traders',
    features: [
      'Unlimited Trade Imports',
      'Direct Broker Integration',
      'Unlimited chart data in records',
      'Priority support'
    ],
    popular: true,
  },
];

function PricingCard({ tier, onUpgrade, className, disabled = false }: PricingCardProps) {
  const { subscription, hasPremiumAccess } = useSubscription();
  const [actionLoading, setActionLoading] = React.useState(false);

  const isCurrentTier = tier.id === 'premium' ? hasPremiumAccess : !hasPremiumAccess;
  const isPremiumTier = tier.id === 'premium';

  const handleUpgrade = async () => {
    if (!onUpgrade || disabled || actionLoading) return;

    setActionLoading(true);
    try {
      await onUpgrade();
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getFeatureIcon = (index: number) => {
    const icons = [
      TrendingUp,
      Database,
      Sparkles,
      Download,
      HeadphonesIcon,
      Check,
      Check,
      Check
    ];
    const IconComponent = icons[index] || Check;
    return <IconComponent className="h-4 w-4" aria-hidden="true" />;
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        isPremiumTier && "ring-2 ring-primary/20",
        isCurrentTier && "ring-2 ring-green-500/20 bg-green-50/30 dark:bg-green-950/10",
        className
      )}
      role="article"
      aria-label={`${tier.name} pricing plan`}
    >
      {tier.popular && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2">
          <Badge className="rounded-full px-3 py-1 text-xs font-medium">
            <Sparkles className="mr-1 h-3 w-3" />
            Most Popular
          </Badge>
        </div>
      )}

      {isCurrentTier && (
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="text-green-600 border-green-600">
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className={cn("text-center", tier.popular && "pt-8")}>
        <div className="flex justify-center mb-2">
          {isPremiumTier ? (
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          ) : (
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <TrendingUp className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
          )}
        </div>

        <CardTitle className="text-xl">{tier.name}</CardTitle>
        
        <div className="space-y-1">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold">{tier.price}</span>
            {tier.price !== '$0' && (
              <span className="text-muted-foreground">/{tier.billing.split(' ')[0]}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{tier.billing}</p>
        </div>

        <CardDescription className="mt-4">{tier.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <ul className="space-y-3" role="list">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 text-yellow-500">
                <Star className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="pt-4">
          {isCurrentTier ? (
            <Button 
              variant="outline" 
              className="w-full" 
              disabled
              aria-label={`Currently using ${tier.name} plan`}
            >
              <Check className="mr-2 h-4 w-4" />
              Current Plan
            </Button>
          ) : isPremiumTier ? (
            <Button 
              onClick={handleUpgrade}
              disabled={disabled || actionLoading}
              className="w-full"
              aria-label="Upgrade to Premium plan"
            >
              {actionLoading ? (
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
          ) : (
            <Button 
              variant="ghost" 
              className="w-full" 
              disabled
              aria-label="Currently on Free plan"
            >
              Current Plan
            </Button>
          )}
        </div>

        {isPremiumTier && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              14-day free trial • Cancel anytime • Secure payment
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PricingCardsProps {
  tiers?: PricingTier[];
  className?: string;
  onUpgrade?: () => Promise<void>;
}

export function PricingCards({ 
  tiers = DEFAULT_TIERS, 
  className, 
  onUpgrade 
}: PricingCardsProps) {
  const { createCheckoutSession, isLoading } = useSubscription();

  const handleUpgrade = async () => {
    if (onUpgrade) {
      await onUpgrade();
      return;
    }

    try {
      const result = await createCheckoutSession();
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        console.error('Upgrade error:', result.error);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    }
  };

  return (
    <div 
      className={cn(
        "grid gap-6 lg:gap-8 md:grid-cols-2 max-w-4xl mx-auto",
        className
      )}
      role="region"
      aria-label="Pricing plans"
    >
      {tiers.map((tier) => (
        <PricingCard
          key={tier.id}
          tier={tier}
          onUpgrade={tier.id === 'premium' ? handleUpgrade : undefined}
          disabled={isLoading}
        />
      ))}
    </div>
  );
}

export { PricingCard, type PricingTier };