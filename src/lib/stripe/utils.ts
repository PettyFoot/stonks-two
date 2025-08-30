import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { getStripeConfig, isStripeConfigured } from './config';
import { CustomerService } from './customerService';
import { SubscriptionService } from './subscriptionService';
import { prisma } from '../prisma';
import type { SubscriptionData, CreateCheckoutSessionParams } from './types';

/**
 * Subscription utility functions
 */

/**
 * Check if user has active premium subscription
 */
export function hasActivePremiumSubscription(subscription?: SubscriptionData | null): boolean {
  if (!subscription) return false;
  
  return (
    subscription.tier === SubscriptionTier.PREMIUM &&
    (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIALING) &&
    new Date() < subscription.currentPeriodEnd
  );
}

/**
 * Check if subscription is in trial period
 */
export function isSubscriptionInTrial(subscription?: SubscriptionData | null): boolean {
  if (!subscription || !subscription.trialEnd) return false;
  
  return (
    subscription.status === SubscriptionStatus.TRIALING &&
    new Date() < subscription.trialEnd
  );
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription?: SubscriptionData | null): number {
  if (!subscription || !subscription.trialEnd) return 0;
  
  const now = new Date();
  const trialEnd = subscription.trialEnd;
  
  if (now >= trialEnd) return 0;
  
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get days remaining in subscription period
 */
export function getDaysUntilRenewal(subscription?: SubscriptionData | null): number {
  if (!subscription) return 0;
  
  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd;
  
  if (now >= periodEnd) return 0;
  
  const diffTime = periodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if subscription will be canceled at period end
 */
export function willCancelAtPeriodEnd(subscription?: SubscriptionData | null): boolean {
  return subscription?.cancelAtPeriodEnd === true;
}

/**
 * Get subscription status display text
 */
export function getSubscriptionStatusText(subscription?: SubscriptionData | null): string {
  if (!subscription) return 'No subscription';
  
  switch (subscription.status) {
    case SubscriptionStatus.ACTIVE:
      if (subscription.cancelAtPeriodEnd) {
        return `Cancels ${subscription.currentPeriodEnd.toLocaleDateString()}`;
      }
      return `Active until ${subscription.currentPeriodEnd.toLocaleDateString()}`;
    
    case SubscriptionStatus.TRIALING:
      const trialDays = getTrialDaysRemaining(subscription);
      return `Trial (${trialDays} days remaining)`;
    
    case SubscriptionStatus.PAST_DUE:
      return 'Payment overdue';
    
    case SubscriptionStatus.CANCELED:
      return 'Canceled';
    
    case SubscriptionStatus.UNPAID:
      return 'Unpaid';
    
    case SubscriptionStatus.INACTIVE:
    default:
      return 'Inactive';
  }
}

/**
 * Get subscription tier display text
 */
export function getSubscriptionTierText(tier: SubscriptionTier): string {
  switch (tier) {
    case SubscriptionTier.PREMIUM:
      return 'Premium';
    case SubscriptionTier.FREE:
    default:
      return 'Free';
  }
}

/**
 * Calculate subscription price display
 */
export function getSubscriptionPriceText(tier: SubscriptionTier): string {
  switch (tier) {
    case SubscriptionTier.PREMIUM:
      if (isStripeConfigured()) {
        try {
          const stripeConfig = getStripeConfig();
          return `$${stripeConfig.PREMIUM_PRICE}/month`;
        } catch (error) {
          // Fallback if config fails
          return '$9.99/month';
        }
      }
      return '$9.99/month';
    case SubscriptionTier.FREE:
    default:
      return 'Free';
  }
}

/**
 * Create a subscription manager for a user
 */
export function createSubscriptionManager(userId: string) {
  const customerService = new CustomerService();
  const subscriptionService = new SubscriptionService();

  return {
    /**
     * Get user's current subscription
     */
    async getCurrentSubscription() {
      if (!isStripeConfigured()) {
        return {
          success: false,
          error: 'Stripe is not configured',
          data: null,
        };
      }
      return subscriptionService.getSubscriptionByUserId(userId);
    },

    /**
     * Create premium subscription checkout session
     */
    async createPremiumCheckoutSession(
      successUrl: string, 
      cancelUrl: string,
      email?: string
    ) {
      if (!isStripeConfigured()) {
        return {
          success: false,
          error: 'Stripe is not configured',
        };
      }

      // Get user details for metadata
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const stripeConfig = getStripeConfig();
      const params: CreateCheckoutSessionParams = {
        priceId: stripeConfig.PREMIUM_PRICE_ID,
        successUrl,
        cancelUrl,
        trialPeriodDays: stripeConfig.TRIAL_PERIOD_DAYS,
        metadata: {
          userId,
          tier: 'premium',
          userName: user.name || email?.split('@')[0] || 'User',
        },
      };

      // Try to get existing customer first
      const customerResult = await customerService.getCustomerByUserId(userId);
      
      if (customerResult.success && customerResult.data) {
        params.customerId = customerResult.data.stripeCustomerId;
      } else if (email) {
        params.customerEmail = email;
      }

      return subscriptionService.createCheckoutSession(params);
    },

    /**
     * Cancel subscription at period end
     */
    async cancelSubscription() {
      if (!isStripeConfigured()) {
        return {
          success: false,
          error: 'Stripe is not configured',
        };
      }

      const subscriptionResult = await subscriptionService.getSubscriptionByUserId(userId);
      
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return {
          success: false,
          error: 'No active subscription found',
        };
      }

      return subscriptionService.cancelSubscription(
        subscriptionResult.data.stripeSubscriptionId
      );
    },

    /**
     * Reactivate canceled subscription
     */
    async reactivateSubscription() {
      if (!isStripeConfigured()) {
        return {
          success: false,
          error: 'Stripe is not configured',
        };
      }

      const subscriptionResult = await subscriptionService.getSubscriptionByUserId(userId);
      
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return {
          success: false,
          error: 'No subscription found',
        };
      }

      return subscriptionService.reactivateSubscription(
        subscriptionResult.data.stripeSubscriptionId
      );
    },

    /**
     * Create billing portal session
     */
    async createBillingPortalSession(returnUrl: string) {
      if (!isStripeConfigured()) {
        return {
          success: false,
          error: 'Stripe is not configured',
        };
      }

      const customerResult = await customerService.getCustomerByUserId(userId);
      
      if (!customerResult.success || !customerResult.data) {
        return {
          success: false,
          error: 'Customer not found',
        };
      }

      return customerService.createBillingPortalSession(
        customerResult.data.stripeCustomerId,
        returnUrl
      );
    },

    /**
     * Check if user has premium access
     */
    async hasPremiumAccess() {
      const subscriptionResult = await this.getCurrentSubscription();
      
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return false;
      }

      return hasActivePremiumSubscription(subscriptionResult.data);
    },

    /**
     * Get subscription display information
     */
    async getSubscriptionDisplayInfo() {
      const subscriptionResult = await this.getCurrentSubscription();
      
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.INACTIVE,
          statusText: 'No subscription',
          priceText: 'Free',
          daysRemaining: 0,
          inTrial: false,
          willCancel: false,
        };
      }

      const subscription = subscriptionResult.data;
      
      return {
        tier: subscription.tier,
        status: subscription.status,
        statusText: getSubscriptionStatusText(subscription),
        priceText: getSubscriptionPriceText(subscription.tier),
        daysRemaining: getDaysUntilRenewal(subscription),
        inTrial: isSubscriptionInTrial(subscription),
        willCancel: willCancelAtPeriodEnd(subscription),
      };
    },
  };
}

/**
 * Format currency amount from cents to dollars
 */
export function formatCurrency(amountInCents: number, currency = 'USD'): string {
  const amount = amountInCents / 100;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Convert dollars to cents for Stripe
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Validate Stripe webhook signature
 */
export function isValidWebhookSignature(
  body: string | Buffer,
  signature: string,
  secret: string
): boolean {
  try {
    const stripe = require('./config').stripe;
    stripe.webhooks.constructEvent(body, signature, secret);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get user permissions based on subscription tier
 */
export function getUserPermissions(tier: SubscriptionTier) {
  const basePermissions = {
    canViewBasicReports: true,
    canImportTrades: false,
    canExportData: false,
    canUseAdvancedFilters: false,
    canAccessPremiumFeatures: false,
    maxTradesPerMonth: 100,
  };

  if (tier === SubscriptionTier.PREMIUM) {
    return {
      ...basePermissions,
      canImportTrades: true,
      canExportData: true,
      canUseAdvancedFilters: true,
      canAccessPremiumFeatures: true,
      maxTradesPerMonth: -1, // Unlimited
    };
  }

  return basePermissions;
}