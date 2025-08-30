import { getStripe, STRIPE_CONFIG } from './config';
import { prisma } from '../prisma';
import { CustomerService } from './customerService';
import {
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  SubscriptionData,
  ServiceResponse,
  CreateCheckoutSessionParams,
  StripeServiceError,
  SubscriptionNotFoundError,
  STRIPE_TO_DB_STATUS,
} from './types';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

/**
 * Subscription Service for managing Stripe subscriptions
 * Handles subscription creation, updates, cancellation, and synchronization
 */
export class SubscriptionService {
  private customerService = new CustomerService();

  /**
   * Create a new subscription for a user
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<ServiceResponse<SubscriptionData>> {
    try {
      const stripe = getStripe();
      // Get or create customer
      const customerResult = await this.customerService.getCustomerByUserId(params.userId);
      
      let stripeCustomerId: string;
      if (!customerResult.success || !customerResult.data) {
        // Create customer if not exists
        const user = await prisma.user.findUnique({
          where: { id: params.userId },
        });

        if (!user) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        const createCustomerResult = await this.customerService.createCustomer({
          userId: params.userId,
          email: user.email,
          name: user.name || undefined,
        });

        if (!createCustomerResult.success || !createCustomerResult.data) {
          return {
            success: false,
            error: createCustomerResult.error || 'Failed to create customer',
          };
        }

        stripeCustomerId = createCustomerResult.data.stripeCustomerId;
      } else {
        stripeCustomerId = customerResult.data.stripeCustomerId;
      }

      // Create subscription in Stripe
      const subscriptionParams: any = {
        customer: stripeCustomerId,
        items: [{ price: params.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: params.userId,
          ...params.metadata,
        },
      };

      if (params.trialPeriodDays) {
        subscriptionParams.trial_period_days = params.trialPeriodDays;
      }

      const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

      // Determine subscription tier based on price ID
      const tier = params.priceId === STRIPE_CONFIG.PREMIUM_PRICE_ID 
        ? SubscriptionTier.PREMIUM 
        : SubscriptionTier.FREE;

      // Save subscription to database
      const subscription = await prisma.subscription.create({
        data: {
          userId: params.userId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId,
          stripePriceId: params.priceId,
          tier,
          status: STRIPE_TO_DB_STATUS[stripeSubscription.status] || SubscriptionStatus.INACTIVE,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
          canceledAt: (stripeSubscription as any).canceled_at 
            ? new Date((stripeSubscription as any).canceled_at * 1000) 
            : null,
          trialStart: (stripeSubscription as any).trial_start 
            ? new Date((stripeSubscription as any).trial_start * 1000) 
            : null,
          trialEnd: (stripeSubscription as any).trial_end 
            ? new Date((stripeSubscription as any).trial_end * 1000) 
            : null,
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(params.userId);

      return {
        success: true,
        data: {
          ...subscription,
          canceledAt: subscription.canceledAt ?? undefined,
          trialStart: subscription.trialStart ?? undefined,
          trialEnd: subscription.trialEnd ?? undefined
        },
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      };
    }
  }

  /**
   * Create Stripe Checkout session for subscription
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<ServiceResponse<{ url: string }>> {
    try {
      const stripe = getStripe();
      
      // Ensure we have a customer ID before creating checkout session
      let customerId = params.customerId;
      
      if (!customerId && params.metadata?.userId && params.customerEmail) {
        // Create customer first to ensure proper linking
        const customerResult = await this.customerService.createCustomer({
          userId: params.metadata.userId,
          email: params.customerEmail,
          name: params.metadata.userName,
        });
        
        if (customerResult.success && customerResult.data) {
          customerId = customerResult.data.stripeCustomerId;
        }
      }
      
      const sessionParams: any = {
        mode: 'subscription',
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        metadata: params.metadata || {},
      };

      if (customerId) {
        sessionParams.customer = customerId;
      } else if (params.customerEmail) {
        sessionParams.customer_email = params.customerEmail;
      }

      if (params.trialPeriodDays) {
        sessionParams.subscription_data = {
          trial_period_days: params.trialPeriodDays,
          metadata: params.metadata || {},
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return {
        success: true,
        data: { url: session.url! },
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      };
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<ServiceResponse<SubscriptionData>> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new SubscriptionNotFoundError(subscriptionId);
      }

      return {
        success: true,
        data: {
          ...subscription,
          canceledAt: subscription.canceledAt ?? undefined,
          trialStart: subscription.trialStart ?? undefined,
          trialEnd: subscription.trialEnd ?? undefined
        },
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subscription',
      };
    }
  }

  /**
   * Get subscription by user ID
   */
  async getSubscriptionByUserId(userId: string): Promise<ServiceResponse<SubscriptionData>> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { 
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        return {
          success: false,
          error: 'No active subscription found for user',
        };
      }

      return {
        success: true,
        data: {
          ...subscription,
          canceledAt: subscription.canceledAt ?? undefined,
          trialStart: subscription.trialStart ?? undefined,
          trialEnd: subscription.trialEnd ?? undefined
        },
      };
    } catch (error) {
      console.error('Error getting subscription by user ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subscription',
      };
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(params: UpdateSubscriptionParams): Promise<ServiceResponse<SubscriptionData>> {
    try {
      const stripe = getStripe();
      const updateParams: any = {};
      
      if (params.priceId) {
        updateParams.items = [{ price: params.priceId }];
        updateParams.proration_behavior = 'create_prorations';
      }

      if (params.cancelAtPeriodEnd !== undefined) {
        updateParams.cancel_at_period_end = params.cancelAtPeriodEnd;
      }

      if (params.metadata) {
        updateParams.metadata = params.metadata;
      }

      const stripeSubscription = await stripe.subscriptions.update(
        params.subscriptionId,
        updateParams
      );

      // Update database record
      const updatedSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: params.subscriptionId },
        data: {
          stripePriceId: params.priceId || undefined,
          status: STRIPE_TO_DB_STATUS[stripeSubscription.status] || SubscriptionStatus.INACTIVE,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
          canceledAt: (stripeSubscription as any).canceled_at 
            ? new Date((stripeSubscription as any).canceled_at * 1000) 
            : null,
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(updatedSubscription.userId);

      return {
        success: true,
        data: {
          ...updatedSubscription,
          canceledAt: updatedSubscription.canceledAt ?? undefined,
          trialStart: updatedSubscription.trialStart ?? undefined,
          trialEnd: updatedSubscription.trialEnd ?? undefined
        },
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription',
      };
    }
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(subscriptionId: string): Promise<ServiceResponse<SubscriptionData>> {
    try {
      const stripe = getStripe();
      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      const updatedSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: (stripeSubscription as any).canceled_at 
            ? new Date((stripeSubscription as any).canceled_at * 1000) 
            : null,
        },
      });

      return {
        success: true,
        data: {
          ...updatedSubscription,
          canceledAt: updatedSubscription.canceledAt ?? undefined,
          trialStart: updatedSubscription.trialStart ?? undefined,
          trialEnd: updatedSubscription.trialEnd ?? undefined
        },
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      };
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<ServiceResponse<SubscriptionData>> {
    try {
      const stripe = getStripe();
      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      const updatedSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          cancelAtPeriodEnd: false,
          canceledAt: null,
          status: STRIPE_TO_DB_STATUS[stripeSubscription.status] || SubscriptionStatus.ACTIVE,
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(updatedSubscription.userId);

      return {
        success: true,
        data: {
          ...updatedSubscription,
          canceledAt: updatedSubscription.canceledAt ?? undefined,
          trialStart: updatedSubscription.trialStart ?? undefined,
          trialEnd: updatedSubscription.trialEnd ?? undefined
        },
      };
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
      };
    }
  }

  /**
   * Immediately cancel subscription (no period end)
   */
  async cancelSubscriptionImmediately(subscriptionId: string): Promise<ServiceResponse<void>> {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(subscriptionId);

      const subscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(subscription.userId);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error canceling subscription immediately:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      };
    }
  }

  /**
   * Sync subscription data from Stripe
   */
  async syncSubscriptionFromStripe(stripeSubscriptionId: string): Promise<ServiceResponse<SubscriptionData>> {
    try {
      const stripe = getStripe();
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      const subscription = await prisma.subscription.update({
        where: { stripeSubscriptionId },
        data: {
          status: STRIPE_TO_DB_STATUS[stripeSubscription.status] || SubscriptionStatus.INACTIVE,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
          canceledAt: (stripeSubscription as any).canceled_at 
            ? new Date((stripeSubscription as any).canceled_at * 1000) 
            : null,
          trialStart: (stripeSubscription as any).trial_start 
            ? new Date((stripeSubscription as any).trial_start * 1000) 
            : null,
          trialEnd: (stripeSubscription as any).trial_end 
            ? new Date((stripeSubscription as any).trial_end * 1000) 
            : null,
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(subscription.userId);

      return {
        success: true,
        data: {
          ...subscription,
          canceledAt: subscription.canceledAt ?? undefined,
          trialStart: subscription.trialStart ?? undefined,
          trialEnd: subscription.trialEnd ?? undefined
        },
      };
    } catch (error) {
      console.error('Error syncing subscription from Stripe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync subscription',
      };
    }
  }

  /**
   * Update user's subscription status and tier based on active subscriptions
   */
  private async updateUserSubscriptionStatus(userId: string): Promise<void> {
    try {
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const updateData: any = {
        subscriptionTier: activeSubscription?.tier || SubscriptionTier.FREE,
        subscriptionStatus: activeSubscription?.status || SubscriptionStatus.INACTIVE,
      };

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating user subscription status:', error);
      // Don't throw here as this is a background operation
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<ServiceResponse<SubscriptionData[]>> {
    try {
      const subscriptions = await prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: subscriptions.map(subscription => ({
          ...subscription,
          canceledAt: subscription.canceledAt ?? undefined,
          trialStart: subscription.trialStart ?? undefined,
          trialEnd: subscription.trialEnd ?? undefined
        })),
      };
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subscriptions',
      };
    }
  }
}