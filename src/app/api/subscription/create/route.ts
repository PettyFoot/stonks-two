import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { createSubscriptionManager } from '@/lib/stripe/utils';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { z } from 'zod';
import { extractCSRFToken, validateCSRFToken, generateCSRFToken, getCSRFResponseHeaders } from '@/lib/utils/csrf';

// Request validation schema
const createSubscriptionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  trialPeriodDays: z.number().min(0).max(30).optional(),
  successUrl: z.string().url('Valid success URL is required'),
  cancelUrl: z.string().url('Valid cancel URL is required'),
  coupon: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/subscription/create
 * Create a new subscription for the authenticated user
 * Returns Stripe Checkout Session URL or creates subscription directly
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // CSRF Protection for subscription creation
    const csrfToken = extractCSRFToken(request.headers);
    const csrfValidation = validateCSRFToken(csrfToken || '', user.id);
    
    if (!csrfValidation.valid) {
      console.warn(`[SECURITY] CSRF validation failed for subscription creation - user ${user.id}: ${csrfValidation.reason}`);
      
      const newToken = generateCSRFToken(user.id);
      const headers = getCSRFResponseHeaders(newToken);
      
      return NextResponse.json(
        { 
          error: 'CSRF token invalid or expired',
          csrfTokenExpired: csrfValidation.expired,
        },
        { 
          status: 403,
          headers
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = createSubscriptionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        },
        { status: 400 }
      );
    }

    const { 
      priceId, 
      trialPeriodDays, 
      successUrl, 
      cancelUrl, 
      coupon, 
      metadata = {} 
    } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/subscription/create - User: ${user.id}, PriceId: ${priceId}`);
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingSubscription) {
      return NextResponse.json(
        {
          error: 'User already has an active subscription',
          subscriptionId: existingSubscription.id,
          status: existingSubscription.status
        },
        { status: 409 }
      );
    }

    // Create subscription manager
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);

    // Get or create Stripe customer
    const customerResult = await subscriptionManager.getOrCreateCustomer({
      email: user.email,
      name: user.name,
      userId: user.id,
      metadata: {
        userId: user.id,
        auth0Id: user.auth0Id || '',
        ...metadata
      }
    });

    if (!customerResult.success || !customerResult.data) {
      return NextResponse.json(
        { 
          error: 'Failed to create or retrieve customer',
          details: customerResult.error 
        },
        { status: 500 }
      );
    }

    // Create checkout session with enhanced parameters
    const checkoutResult = await subscriptionManager.createPremiumCheckoutSession(
      successUrl,
      cancelUrl,
      user.email,
      {
        customerId: customerResult.data.stripeCustomerId,
        priceId,
        trialPeriodDays,
        coupon,
        metadata: {
          userId: user.id,
          tier: 'PREMIUM',
          createdBy: 'api',
          ...metadata
        },
        allowPromotionCodes: true,
        billingAddressCollection: 'required',
        automaticTax: { enabled: true },
      }
    );

    if (!checkoutResult.success || !checkoutResult.data) {
      return NextResponse.json(
        {
          error: 'Failed to create checkout session',
          details: checkoutResult.error
        },
        { status: 500 }
      );
    }

    // Track subscription creation attempt
    await prisma.user.update({
      where: { id: user.id },
      data: {
        updatedAt: new Date()
      }
    });

    // Log subscription creation attempt
    if (process.env.NODE_ENV === 'production') {
      console.log(`[SUBSCRIPTION] User ${user.id} initiated subscription creation with price ${priceId}`);
    }

    const response = {
      success: true,
      checkoutUrl: checkoutResult.data.url,
      sessionId: checkoutResult.data.id,
      customerId: customerResult.data.stripeCustomerId,
      priceId,
      metadata: {
        trialPeriodDays: trialPeriodDays || 0,
        coupon: coupon || null,
      },
      message: 'Checkout session created successfully',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          customerEmail: user.email,
          sessionUrl: checkoutResult.data.url,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/subscription/create completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[API] POST /api/subscription/create error:', error);
    
    // Enhanced error logging for subscription creation failures
    if (error instanceof Error) {
      console.error('[SUBSCRIPTION_CREATE_ERROR]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    const errorResponse = {
      error: 'Failed to create subscription',
      code: 'SUBSCRIPTION_CREATION_FAILED',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/subscription/create
 * Get available subscription plans and pricing information
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get available plans configuration
    const plans = [
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        description: 'Full access to all features with monthly billing',
        price: 999, // $9.99 in cents
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        features: [
          'Unlimited trades tracking',
          'Advanced analytics and reports',
          'Data export capabilities',
          'Priority customer support',
          'Custom report generation',
          'Real-time market data',
          'Portfolio performance tracking',
        ],
        recommended: true,
        trialDays: 7,
      },
      {
        id: 'premium_yearly',
        name: 'Premium Yearly',
        description: 'Full access to all features with yearly billing (2 months free)',
        price: 9999, // $99.99 in cents (equivalent to ~$8.33/month)
        currency: 'usd',
        interval: 'year',
        intervalCount: 1,
        features: [
          'Unlimited trades tracking',
          'Advanced analytics and reports', 
          'Data export capabilities',
          'Priority customer support',
          'Custom report generation',
          'Real-time market data',
          'Portfolio performance tracking',
          '2 months free (17% savings)',
        ],
        recommended: false,
        trialDays: 7,
      }
    ];

    // Check current user subscription status
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { not: SubscriptionStatus.CANCELED }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        tier: true,
        status: true,
        stripePriceId: true,
      }
    });

    const response = {
      plans,
      currentSubscription: currentSubscription ? {
        tier: currentSubscription.tier,
        status: currentSubscription.status,
        priceId: currentSubscription.stripePriceId,
      } : null,
      currency: 'usd',
      taxInclusive: false,
      supportedPaymentMethods: ['card'],
      features: {
        free: [
          'Up to 100 trades per month',
          'Basic analytics',
          'Standard support',
        ],
        premium: [
          'Unlimited trades tracking',
          'Advanced analytics and reports',
          'Data export capabilities', 
          'Priority customer support',
          'Custom report generation',
          'Real-time market data',
          'Portfolio performance tracking',
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/subscription/create error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}

// Only allow GET and POST methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}