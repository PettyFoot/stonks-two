import Stripe from 'stripe';
import { StripeServiceError } from './types';

/**
 * Error handling utilities for Stripe integration
 */

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export type ServiceResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Handle Stripe API errors with proper error messages
 */
export function handleStripeError(error: any): ErrorResponse {
  console.error('Stripe error:', error);

  if (error instanceof Stripe.errors.StripeError) {
    switch (error.type) {
      case 'StripeCardError':
        return {
          success: false,
          error: error.message || 'Your card was declined. Please try a different payment method.',
          code: error.code,
          details: {
            declineCode: error.decline_code,
            param: error.param,
          },
        };

      case 'StripeRateLimitError':
        return {
          success: false,
          error: 'Too many requests. Please wait a moment and try again.',
          code: 'rate_limit',
        };

      case 'StripeInvalidRequestError':
        return {
          success: false,
          error: error.message || 'Invalid request. Please check your input and try again.',
          code: error.code,
          details: {
            param: error.param,
          },
        };

      case 'StripeAPIError':
        return {
          success: false,
          error: 'Payment service temporarily unavailable. Please try again later.',
          code: 'api_error',
        };

      case 'StripeConnectionError':
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
          code: 'connection_error',
        };

      case 'StripeAuthenticationError':
        return {
          success: false,
          error: 'Authentication failed. Please contact support.',
          code: 'authentication_error',
        };

      case 'StripePermissionError':
        return {
          success: false,
          error: 'Insufficient permissions. Please contact support.',
          code: 'permission_error',
        };

      default:
        return {
          success: false,
          error: error.message || 'An unexpected error occurred with the payment service.',
          code: error.code,
        };
    }
  }

  if (error instanceof StripeServiceError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.stripeError ? {
        stripeError: error.stripeError.message,
        stripeType: error.stripeError.type,
      } : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'unknown_error',
    };
  }

  return {
    success: false,
    error: 'An unknown error occurred. Please try again.',
    code: 'unknown_error',
  };
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<ServiceResponse<T>> {
  try {
    const result = await operation();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (context) {
      console.error(`Error in ${context}:`, error);
    }
    return handleStripeError(error);
  }
}

/**
 * Validate required environment variables for Stripe
 */
export function validateEnvironmentVariables(): { isValid: boolean; missing: string[] } {
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PREMIUM_PRICE_ID',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Log error with context for monitoring
 */
export function logError(error: any, context: string, metadata?: any): void {
  const errorInfo = {
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    metadata,
    timestamp: new Date().toISOString(),
  };

  console.error('Stripe Service Error:', errorInfo);

  // Here you could integrate with error monitoring services like Sentry
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     tags: { context },
  //     extra: metadata,
  //   });
  // }
}

/**
 * Retry mechanism for transient errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain error types
      if (error instanceof Stripe.errors.StripeError) {
        const nonRetryableErrors = [
          'StripeCardError',
          'StripeInvalidRequestError',
          'StripeAuthenticationError',
          'StripePermissionError',
        ];

        if (nonRetryableErrors.includes(error.type)) {
          throw error;
        }
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

/**
 * Create a safe async handler for API routes
 */
export function createSafeHandler<T>(
  handler: () => Promise<T>
) {
  return async () => {
    try {
      const result = await handler();
      return {
        success: true,
        data: result,
      } as SuccessResponse<T>;
    } catch (error) {
      return handleStripeError(error);
    }
  };
}

/**
 * Validate webhook signature safely
 */
export function validateWebhookSignature(
  body: string | Buffer,
  signature: string,
  secret: string
): { isValid: boolean; error?: string } {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    stripe.webhooks.constructEvent(body, signature, secret);
    return { isValid: true };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return {
        isValid: false,
        error: 'Invalid webhook signature',
      };
    }
    
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Webhook validation failed',
    };
  }
}