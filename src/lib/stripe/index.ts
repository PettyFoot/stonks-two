// Stripe Service Layer
export { stripe, STRIPE_CONFIG, validateStripeConfig } from './config';

// Services
export { CustomerService } from './customerService';
export { SubscriptionService } from './subscriptionService';
export { PaymentService } from './paymentService';
export { WebhookService } from './webhookService';

// Types
export * from './types';

// Service instances (singletons)
import { CustomerService } from './customerService';
import { SubscriptionService } from './subscriptionService';
import { PaymentService } from './paymentService';
import { WebhookService } from './webhookService';

export const customerService = new CustomerService();
export const subscriptionService = new SubscriptionService();
export const paymentService = new PaymentService();
export const webhookService = new WebhookService();

// Utility functions
export { createSubscriptionManager } from './utils';

// Re-export Stripe types for convenience
export type { Stripe } from 'stripe';