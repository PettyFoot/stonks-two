import { SubscriptionTier, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';

// Subscription-related types
export interface SubscriptionData {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionParams {
  userId: string;
  priceId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

// Payment-related types
export interface PaymentData {
  id: string;
  userId: string;
  stripePaymentIntentId: string;
  stripeSubscriptionId?: string;
  amount: number; // Amount in cents
  currency: string;
  status: PaymentStatus;
  description?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentIntentParams {
  amount: number; // Amount in cents
  currency?: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
}

// Customer-related types
export interface CustomerData {
  stripeCustomerId: string;
  email: string;
  name?: string;
  userId: string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  userId: string;
  metadata?: Record<string, string>;
}

// Webhook-related types
export interface WebhookEventData {
  id: string;
  stripeEventId: string;
  eventType: string;
  processed: boolean;
  processedAt?: Date;
  data: any;
  createdAt: Date;
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Subscription management types
export interface SubscriptionWithCustomer extends SubscriptionData {
  customer?: CustomerData;
}

// Billing portal session
export interface BillingPortalParams {
  customerId: string;
  returnUrl: string;
}

// Checkout session types
export interface CreateCheckoutSessionParams {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

// Stripe webhook event types we handle
export type StripeWebhookEvent = 
  | 'customer.subscription.created'
  | 'customer.subscription.updated' 
  | 'customer.subscription.deleted'
  | 'checkout.session.completed'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.created'
  | 'customer.updated'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed';

// Subscription status mapping
export const STRIPE_TO_DB_STATUS: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  'active': SubscriptionStatus.ACTIVE,
  'canceled': SubscriptionStatus.CANCELED,
  'past_due': SubscriptionStatus.PAST_DUE,
  'unpaid': SubscriptionStatus.UNPAID,
  'trialing': SubscriptionStatus.TRIALING,
  'incomplete': SubscriptionStatus.INACTIVE,
  'incomplete_expired': SubscriptionStatus.INACTIVE,
  'paused': SubscriptionStatus.INACTIVE,
};

// Payment status mapping  
export const STRIPE_TO_DB_PAYMENT_STATUS: Record<Stripe.PaymentIntent.Status, PaymentStatus> = {
  'succeeded': PaymentStatus.SUCCEEDED,
  'pending': PaymentStatus.PENDING,
  'requires_payment_method': PaymentStatus.FAILED,
  'requires_confirmation': PaymentStatus.PENDING,
  'requires_action': PaymentStatus.PENDING,
  'processing': PaymentStatus.PENDING,
  'requires_capture': PaymentStatus.PENDING,
  'canceled': PaymentStatus.CANCELED,
};

// Error types
export class StripeServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly stripeError?: Stripe.StripeError
  ) {
    super(message);
    this.name = 'StripeServiceError';
  }
}

export class SubscriptionNotFoundError extends StripeServiceError {
  constructor(subscriptionId: string) {
    super(`Subscription not found: ${subscriptionId}`, 'SUBSCRIPTION_NOT_FOUND');
  }
}

export class CustomerNotFoundError extends StripeServiceError {
  constructor(customerId: string) {
    super(`Customer not found: ${customerId}`, 'CUSTOMER_NOT_FOUND');
  }
}