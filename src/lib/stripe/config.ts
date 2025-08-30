import Stripe from 'stripe';

let _stripe: Stripe | null = null;

// Lazy initialize Stripe only when needed
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      appInfo: {
        name: 'StonksTwo Trading Platform',
        version: '1.0.0',
        url: process.env.APP_BASE_URL || 'https://stonkstwo.com',
      },
      typescript: true,
    });
  }
  return _stripe;
}

// Check if Stripe is configured without throwing
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Legacy export for backward compatibility
export const stripe = getStripe;

// Stripe configuration constants - lazy loaded
let _stripeConfig: Record<string, string | number> | null = null;

export function getStripeConfig() {
  if (!_stripeConfig) {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    _stripeConfig = {
      PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID!,
      WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
      PREMIUM_PRICE: parseFloat(process.env.STRIPE_PREMIUM_PRICE || '9.99'), // Default $9.99/month
      CURRENCY: process.env.STRIPE_CURRENCY || 'usd',
      BILLING_INTERVAL: (process.env.STRIPE_BILLING_INTERVAL as 'month' | 'year') || 'month',
      TRIAL_PERIOD_DAYS: parseInt(process.env.STRIPE_TRIAL_PERIOD_DAYS || '14'), // Default 14-day free trial
    } as const;
  }
  return _stripeConfig;
}

// Legacy export for backward compatibility
export const STRIPE_CONFIG = new Proxy({} as Record<string, unknown>, {
  get(target, prop) {
    if (typeof prop === 'string') {
      return getStripeConfig()[prop];
    }
    return undefined;
  }
});

// Validate required environment variables
export function validateStripeConfig() {
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PREMIUM_PRICE_ID',
    'STRIPE_WEBHOOK_SECRET',
  ];

  const optional = [
    'STRIPE_PREMIUM_PRICE',
    'STRIPE_CURRENCY',
    'STRIPE_BILLING_INTERVAL',
    'STRIPE_TRIAL_PERIOD_DAYS',
    'CSRF_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Stripe environment variables: ${missing.join(', ')}`);
  }

  // Validate optional environment variables have correct formats
  if (process.env.STRIPE_PREMIUM_PRICE && isNaN(parseFloat(process.env.STRIPE_PREMIUM_PRICE))) {
    throw new Error('STRIPE_PREMIUM_PRICE must be a valid number');
  }

  if (process.env.STRIPE_TRIAL_PERIOD_DAYS && isNaN(parseInt(process.env.STRIPE_TRIAL_PERIOD_DAYS))) {
    throw new Error('STRIPE_TRIAL_PERIOD_DAYS must be a valid number');
  }

  if (process.env.STRIPE_BILLING_INTERVAL && !['month', 'year'].includes(process.env.STRIPE_BILLING_INTERVAL)) {
    throw new Error('STRIPE_BILLING_INTERVAL must be "month" or "year"');
  }

  // Warn about missing optional variables in development
  if (process.env.NODE_ENV === 'development') {
    const missingOptional = optional.filter(key => !process.env[key]);
    if (missingOptional.length > 0) {
      console.warn(`[STRIPE] Optional environment variables not set (using defaults): ${missingOptional.join(', ')}`);
    }
  }
}

export default getStripe;