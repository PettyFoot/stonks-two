'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { Crown, Lock } from 'lucide-react';
import { InlineTriangleLoader } from '@/components/ui/TriangleLoader';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
  showUpgrade?: boolean;
  className?: string;
}

/**
 * Component that restricts content to premium users
 * Shows upgrade prompt if user doesn't have premium access
 */
export function PremiumGate({ 
  children, 
  fallback, 
  feature = 'this feature',
  showUpgrade = true,
  className 
}: PremiumGateProps) {
  const { hasPremiumAccess, isLoading, createCheckoutSession } = useSubscription();
  const [upgradeLoading, setUpgradeLoading] = React.useState(false);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const result = await createCheckoutSession();
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        console.error('Upgrade error:', result.error);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className || ''}`}>
        <InlineTriangleLoader size="lg" />
      </div>
    );
  }

  if (hasPremiumAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
            <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-5 w-5" />
          Premium Feature
        </CardTitle>
        <CardDescription>
          Upgrade to Premium to access {feature}
        </CardDescription>
      </CardHeader>

      {showUpgrade && (
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Premium includes:</p>
              <ul className="mt-2 space-y-1">
                <li>• Unlimited trade imports</li>
                <li>• Advanced analytics and reports</li>
                <li>• Data export capabilities</li>
                <li>• Priority support</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="w-full"
            >
              {upgradeLoading ? (
                <>
                  <InlineTriangleLoader size="sm" />
                  Loading...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Premium - $9.99/month
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              14-day free trial • Cancel anytime
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Higher-order component that wraps components with premium gate
 */
export function withPremiumGate<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    feature?: string;
    showUpgrade?: boolean;
    fallback?: React.ReactNode;
  }
) {
  return function PremiumWrappedComponent(props: P) {
    return (
      <PremiumGate
        feature={options?.feature}
        showUpgrade={options?.showUpgrade}
        fallback={options?.fallback}
      >
        <Component {...props} />
      </PremiumGate>
    );
  };
}

/**
 * Hook to conditionally render content based on premium access
 */
export function usePremiumGate() {
  const { hasPremiumAccess, isLoading } = useSubscription();

  const renderPremium = (content: React.ReactNode, fallback?: React.ReactNode) => {
    if (isLoading) {
      return <InlineTriangleLoader size="sm" />;
    }
    
    return hasPremiumAccess ? content : fallback;
  };

  return {
    hasPremiumAccess,
    isLoading,
    renderPremium,
  };
}