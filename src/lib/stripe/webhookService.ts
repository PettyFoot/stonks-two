import { getStripe, STRIPE_CONFIG } from './config';
import { prisma } from '../prisma';
import { SubscriptionService } from './subscriptionService';
import { PaymentService } from './paymentService';
import { CustomerService } from './customerService';
import {
  WebhookEventData,
  ServiceResponse,
  StripeWebhookEvent,
  StripeServiceError,
  STRIPE_TO_DB_STATUS,
} from './types';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

/**
 * Webhook Service for handling Stripe webhook events
 * Processes subscription, payment, and customer events
 */
export class WebhookService {
  private subscriptionService = new SubscriptionService();
  private paymentService = new PaymentService();
  private customerService = new CustomerService();

  /**
   * Process incoming webhook event
   */
  async processWebhook(
    body: string | Buffer,
    signature: string
  ): Promise<ServiceResponse<{ processed: boolean; eventType: string }>> {
    try {
      const stripe = getStripe();
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_CONFIG.WEBHOOK_SECRET as string
      );

      // Check if event was already processed (optimized with select)
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { stripeEventId: event.id },
        select: { processed: true, id: true },
      });

      if (existingEvent?.processed) {

        return {
          success: true,
          data: { processed: true, eventType: event.type },
        };
      }



      // Save webhook event
      await this.saveWebhookEvent(event);

      // Process the event based on type
      await this.handleWebhookEvent(event);

      // Mark event as processed
      await prisma.webhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        data: { processed: true, eventType: event.type },
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        return {
          success: false,
          error: 'Invalid webhook signature',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process webhook',
      };
    }
  }

  /**
   * Handle specific webhook event types
   */
  private async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const eventType = event.type as StripeWebhookEvent;

    try {
      switch (eventType) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:

      }
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      // First try to get user by customer ID
      let user = await prisma.user.findUnique({
        where: { stripeCustomerId: subscription.customer as string },
      });

      // If user not found by customer ID, try to find by metadata userId
      if (!user && subscription.metadata?.userId) {

        
        user = await prisma.user.findUnique({
          where: { id: subscription.metadata.userId },
        });

        // If found, update user with the customer ID
        if (user && !user.stripeCustomerId) {

          user = await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: subscription.customer as string },
          });
        }
      }

      if (!user) {
        console.error(`User not found for customer ${subscription.customer} and metadata userId ${subscription.metadata?.userId}`);
        return;
      }

      // Check if subscription already exists to prevent duplicates
      const existingSubscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (existingSubscription) {

        await this.handleSubscriptionUpdated(subscription);
        return;
      }

      // Determine subscription tier
      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId === STRIPE_CONFIG.PREMIUM_PRICE_ID 
        ? SubscriptionTier.PREMIUM 
        : SubscriptionTier.FREE;

      // Create subscription record
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: priceId,
          tier,
          status: STRIPE_TO_DB_STATUS[subscription.status] || SubscriptionStatus.INACTIVE,
          currentPeriodStart: (subscription as any).current_period_start 
            ? new Date((subscription as any).current_period_start * 1000) 
            : new Date(),
          currentPeriodEnd: (subscription as any).current_period_end 
            ? new Date((subscription as any).current_period_end * 1000) 
            : new Date(),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          canceledAt: (subscription as any).canceled_at 
            ? new Date((subscription as any).canceled_at * 1000) 
            : null,
          trialStart: subscription.trial_start 
            ? new Date(subscription.trial_start * 1000) 
            : null,
          trialEnd: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : null,
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(user.id);


    } catch (error) {
      console.error('[WEBHOOK] Error handling subscription created:', error);
      console.error('[WEBHOOK] Subscription details:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
        metadata: subscription.metadata,
      });
      throw error;
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId === STRIPE_CONFIG.PREMIUM_PRICE_ID 
        ? SubscriptionTier.PREMIUM 
        : SubscriptionTier.FREE;

      // Update subscription record
      const updatedSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          stripePriceId: priceId,
          tier,
          status: STRIPE_TO_DB_STATUS[subscription.status] || SubscriptionStatus.INACTIVE,
          currentPeriodStart: (subscription as any).current_period_start 
            ? new Date((subscription as any).current_period_start * 1000) 
            : new Date(),
          currentPeriodEnd: (subscription as any).current_period_end 
            ? new Date((subscription as any).current_period_end * 1000) 
            : new Date(),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          canceledAt: (subscription as any).canceled_at 
            ? new Date((subscription as any).canceled_at * 1000) 
            : null,
          trialStart: subscription.trial_start 
            ? new Date(subscription.trial_start * 1000) 
            : null,
          trialEnd: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : null,
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(updatedSubscription.userId);


    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Update subscription record
      const updatedSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      });

      // Update user subscription status
      await this.updateUserSubscriptionStatus(updatedSubscription.userId);


    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Handle successful invoice payment
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      if ((invoice as any).subscription && (invoice as any).payment_intent) {
        // Get payment intent details for payment history
        const stripe = getStripe();
        const paymentIntent = await stripe.paymentIntents.retrieve(
          (invoice as any).payment_intent as string
        );

        // Process the payment
        await this.paymentService.processSuccessfulPayment(paymentIntent);
      }


    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle failed invoice payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      if ((invoice as any).subscription) {
        // Update subscription status to past due
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: (invoice as any).subscription as string },
          data: { status: SubscriptionStatus.PAST_DUE },
        });

        // Get user ID and update status
        const subscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: (invoice as any).subscription as string },
        });

        if (subscription) {
          await this.updateUserSubscriptionStatus(subscription.userId);
        }
      }


    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
      throw error;
    }
  }

  /**
   * Handle customer created event
   */
  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    try {
      const userId = customer.metadata?.userId;
      
      if (userId) {
        // Verify user exists and doesn't already have a customer ID
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
        });
        
        if (!existingUser) {
          console.error(`[WEBHOOK] User ${userId} not found for customer creation ${customer.id}`);
          return;
        }
        
        if (existingUser.stripeCustomerId && existingUser.stripeCustomerId !== customer.id) {
          console.warn(`[WEBHOOK] User ${userId} already has different customer ID: ${existingUser.stripeCustomerId}, new: ${customer.id}`);
          return;
        }
        
        // Safe update with verification
        try {
          await prisma.user.update({
            where: { 
              id: userId,
              OR: [
                { stripeCustomerId: null },
                { stripeCustomerId: customer.id }
              ]
            },
            data: { stripeCustomerId: customer.id },
          });

        } catch (updateError) {
          console.error(`[WEBHOOK] Failed to update user ${userId} with customer ID ${customer.id}:`, updateError);
          // Don't throw, this is not critical for webhook processing
        }
      } else {
        console.warn(`[WEBHOOK] Customer created without userId in metadata: ${customer.id}`);
      }


    } catch (error) {
      console.error('[WEBHOOK] Error handling customer created:', error);
      throw error;
    }
  }

  /**
   * Handle customer updated event
   */
  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    try {
      // Find the specific user with this customer ID
      const existingUser = await prisma.user.findUnique({
        where: { stripeCustomerId: customer.id },
      });
      
      if (!existingUser) {
        console.warn(`No user found for customer update: ${customer.id}`);
        return;
      }
      
      // Verify this customer actually belongs to this user
      if (existingUser.stripeCustomerId !== customer.id) {
        console.error(`Customer ID mismatch for user ${existingUser.id}: ${existingUser.stripeCustomerId} vs ${customer.id}`);
        return;
      }
      
      // Only update if email actually changed and is valid
      if (customer.email && customer.email !== existingUser.email) {
        // Additional security: Don't allow email updates that could hijack accounts
        const emailExists = await prisma.user.findUnique({
          where: { email: customer.email },
        });
        
        if (emailExists && emailExists.id !== existingUser.id) {
          console.warn(`Attempted email hijack: Customer ${customer.id} tried to update to existing email ${customer.email}`);
          return;
        }
        
        // Safe update with specific user ID
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { 
            email: customer.email,
            name: customer.name || existingUser.name,
          },
        });
        

      }


    } catch (error) {
      console.error('Error handling customer updated:', error);
      // Don't throw for customer updates as they're not critical
    }
  }

  /**
   * Handle payment intent succeeded
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await this.paymentService.processSuccessfulPayment(paymentIntent);

    } catch (error) {
      console.error('Error handling payment intent succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle payment intent failed
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await this.paymentService.processFailedPayment(paymentIntent);

    } catch (error) {
      console.error('Error handling payment intent failed:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed event
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      // Only process subscription mode sessions
      if (session.mode !== 'subscription' || !session.subscription) {

        return;
      }
      
      // Get user from metadata
      const userId = session.metadata?.userId;
      if (!userId) {
        console.error(`[WEBHOOK] No userId in checkout session metadata: ${session.id}`);
        return;
      }



      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.error(`[WEBHOOK] User not found for checkout session: ${userId}`);
        return;
      }

      // Update user with customer ID if not already set
      if (!user.stripeCustomerId && session.customer) {
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: session.customer as string },
        });

      }
      
      // Get full subscription from Stripe
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      
      // Check if subscription already exists to prevent duplicates
      const existingSubscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (existingSubscription) {

        return;
      }

      // Determine subscription tier
      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId === STRIPE_CONFIG.PREMIUM_PRICE_ID 
        ? SubscriptionTier.PREMIUM 
        : SubscriptionTier.FREE;

      // Create subscription record with proper status
      await prisma.subscription.create({
        data: {
          userId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: session.customer as string,
          stripePriceId: priceId,
          tier,
          status: STRIPE_TO_DB_STATUS[subscription.status] || SubscriptionStatus.INACTIVE,
          currentPeriodStart: (subscription as any).current_period_start 
            ? new Date((subscription as any).current_period_start * 1000) 
            : new Date(),
          currentPeriodEnd: (subscription as any).current_period_end 
            ? new Date((subscription as any).current_period_end * 1000) 
            : new Date(),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          trialStart: subscription.trial_start 
            ? new Date(subscription.trial_start * 1000) 
            : null,
          trialEnd: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : null,
        },
      });

      // Update user subscription status immediately
      await this.updateUserSubscriptionStatus(userId);


    } catch (error) {
      console.error('[WEBHOOK] Error handling checkout session completed:', error);
      throw error;
    }
  }

  /**
   * Save webhook event to database
   */
  private async saveWebhookEvent(event: Stripe.Event): Promise<WebhookEventData> {
    try {
      const webhookEvent = await prisma.webhookEvent.upsert({
        where: { stripeEventId: event.id },
        update: {
          eventType: event.type,
          data: event.data as any,
        },
        create: {
          stripeEventId: event.id,
          eventType: event.type,
          data: event.data as any,
        },
      });
      
      return {
        ...webhookEvent,
        processedAt: webhookEvent.processedAt ?? undefined
      };
    } catch (error) {
      console.error('Error saving webhook event:', error);
      throw error;
    }
  }

  /**
   * Update user's subscription status and tier
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

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: activeSubscription?.tier || SubscriptionTier.FREE,
          subscriptionStatus: activeSubscription?.status || SubscriptionStatus.INACTIVE,
        },
      });
    } catch (error) {
      console.error('Error updating user subscription status:', error);
      // Don't throw as this is a background operation
    }
  }

  /**
   * Get webhook event processing status
   */
  async getWebhookEventStatus(stripeEventId: string): Promise<ServiceResponse<WebhookEventData>> {
    try {
      const event = await prisma.webhookEvent.findUnique({
        where: { stripeEventId },
      });

      if (!event) {
        return {
          success: false,
          error: 'Webhook event not found',
        };
      }

      return {
        success: true,
        data: {
          ...event,
          processedAt: event.processedAt ?? undefined
        },
      };
    } catch (error) {
      console.error('Error getting webhook event status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get webhook event status',
      };
    }
  }
}