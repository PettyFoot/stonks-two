import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { getUserPermissions } from '@/lib/stripe/utils';

interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  statusText: string;
  priceText: string;
  daysRemaining: number;
  inTrial: boolean;
  willCancel: boolean;
  nextBillingDate: Date | null;
}

interface UseSubscriptionReturn {
  subscription: SubscriptionInfo | null;
  permissions: ReturnType<typeof getUserPermissions>;
  isLoading: boolean;
  error: string | null;
  createCheckoutSession: (successUrl?: string, cancelUrl?: string) => Promise<{ url?: string; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  reactivateSubscription: () => Promise<{ success: boolean; error?: string }>;
  createBillingPortalSession: (returnUrl?: string) => Promise<{ url?: string; error?: string }>;
  refreshSubscription: () => Promise<void>;
  hasPremiumAccess: boolean;
}

/**
 * Hook for managing user subscription state and actions
 * Provides subscription info, permissions, and management functions
 */
export function useSubscription(): UseSubscriptionReturn {
  const { user, isLoading: authLoading } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user permissions based on current subscription tier
  const permissions = subscription 
    ? getUserPermissions(subscription.tier)
    : getUserPermissions(SubscriptionTier.FREE);

  const hasPremiumAccess = subscription?.tier === SubscriptionTier.PREMIUM && 
    (subscription?.status === SubscriptionStatus.ACTIVE || subscription?.status === SubscriptionStatus.TRIALING);

  /**
   * Fetch subscription information from API
   */
  const fetchSubscription = useCallback(async (): Promise<void> => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/stripe/subscription');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          setSubscription(null);
          return;
        }
        throw new Error('Failed to fetch subscription');
      }

      const data: SubscriptionInfo = await response.json();
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      
      // Set default free subscription on error
      setSubscription({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.INACTIVE,
        statusText: 'Free',
        priceText: 'Free',
        daysRemaining: 0,
        inTrial: false,
        willCancel: false,
        nextBillingDate: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Create checkout session for premium subscription
   */
  const createCheckoutSession = useCallback(async (
    successUrl?: string,
    cancelUrl?: string
  ): Promise<{ url?: string; error?: string }> => {
    try {
      const currentUrl = window.location.origin;
      const success = successUrl || `${currentUrl}/dashboard?upgrade=success`;
      const cancel = cancelUrl || `${currentUrl}/dashboard?upgrade=canceled`;

      const response = await fetch(
        `/api/stripe/checkout?success_url=${encodeURIComponent(success)}&cancel_url=${encodeURIComponent(cancel)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'Failed to create checkout session' };
      }

      const data = await response.json();
      return { url: data.url };
    } catch (err) {
      console.error('Error creating checkout session:', err);
      return { error: err instanceof Error ? err.message : 'Failed to create checkout session' };
    }
  }, []);

  /**
   * Cancel subscription at period end
   */
  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to cancel subscription' };
      }

      const data = await response.json();
      setSubscription(data.subscription);
      return { success: true };
    } catch (err) {
      console.error('Error canceling subscription:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel subscription' };
    }
  }, []);

  /**
   * Reactivate canceled subscription
   */
  const reactivateSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reactivate' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to reactivate subscription' };
      }

      const data = await response.json();
      setSubscription(data.subscription);
      return { success: true };
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reactivate subscription' };
    }
  }, []);

  /**
   * Create billing portal session for subscription management
   */
  const createBillingPortalSession = useCallback(async (
    returnUrl?: string
  ): Promise<{ url?: string; error?: string }> => {
    try {
      const currentUrl = window.location.origin;
      const return_url = returnUrl || `${currentUrl}/settings`;

      const response = await fetch(
        `/api/stripe/billing-portal?return_url=${encodeURIComponent(return_url)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'Failed to create billing portal session' };
      }

      const data = await response.json();
      return { url: data.url };
    } catch (err) {
      console.error('Error creating billing portal session:', err);
      return { error: err instanceof Error ? err.message : 'Failed to create billing portal session' };
    }
  }, []);

  /**
   * Refresh subscription data
   */
  const refreshSubscription = useCallback(async (): Promise<void> => {
    await fetchSubscription();
  }, [fetchSubscription]);

  // Fetch subscription on mount and when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, fetchSubscription]);

  return {
    subscription,
    permissions,
    isLoading: isLoading || authLoading,
    error,
    createCheckoutSession,
    cancelSubscription,
    reactivateSubscription,
    createBillingPortalSession,
    refreshSubscription,
    hasPremiumAccess,
  };
}