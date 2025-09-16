import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { createSubscriptionManager } from '@/lib/stripe/utils';
import { SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';

// Request validation schema
const changePlanSchema = z.object({
  newPriceId: z.string().min(1, 'New price ID is required'),
  prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice']).optional().default('create_prorations'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/subscription/change-plan
 * Change the user's subscription plan
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

    const validationResult = changePlanSchema.safeParse(body);
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

    const { newPriceId, prorationBehavior, metadata = {} } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {

    }

    // Get current active subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { 
          error: 'No active subscription found to modify',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        },
        { status: 404 }
      );
    }

    // Check if already using this price
    if (currentSubscription.stripePriceId === newPriceId) {
      return NextResponse.json(
        {
          error: 'Subscription is already using this price',
          currentPriceId: currentSubscription.stripePriceId,
          newPriceId
        },
        { status: 409 }
      );
    }

    // Create subscription manager
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);

    // Get current subscription details before change
    const currentDisplayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    // Perform plan change using subscription service directly
    const { subscriptionService } = await import('@/lib/stripe');
    const changeResult = await subscriptionService.updateSubscription({
      subscriptionId: currentSubscription.stripeSubscriptionId,
      priceId: newPriceId,
      metadata: {
        userId: user.id,
        changedBy: 'user',
        changedAt: new Date().toISOString(),
        oldPriceId: currentSubscription.stripePriceId,
        ...metadata
      }
    });

    if (!changeResult.success) {
      return NextResponse.json(
        {
          error: changeResult.error || 'Failed to change subscription plan',
          code: 'PLAN_CHANGE_FAILED'
        },
        { status: 400 }
      );
    }

    // Update local database
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        stripePriceId: newPriceId,
        updatedAt: new Date(),
      }
    });

    // Get updated subscription info
    const updatedDisplayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    // Note: Price difference calculation removed since billing info isn't available in displayInfo

    // Log successful plan change
    if (process.env.NODE_ENV === 'production') {

    }

    const response = {
      success: true,
      planChanged: true,
      subscription: updatedDisplayInfo,
      changeDetails: {
        oldPriceId: currentSubscription.stripePriceId,
        newPriceId,
        prorationBehavior,
        effectiveDate: new Date(),
      },
      message: 'Plan changed successfully.',
      billing: {
        nextBillingDate: currentSubscription.currentPeriodEnd,
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          subscriptionId: currentSubscription.id,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {

    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] POST /api/subscription/change-plan error:', error);
    
    // Enhanced error logging for plan change failures
    if (error instanceof Error) {
      console.error('[SUBSCRIPTION_CHANGE_PLAN_ERROR]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    const errorResponse = {
      error: 'Failed to change subscription plan',
      code: 'PLAN_CHANGE_FAILED',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/subscription/change-plan
 * Get available plan change options and preview
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current active subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tier: true,
        status: true,
        stripePriceId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        stripeSubscriptionId: true,
      }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { 
          canChangePlan: false,
          reason: 'No active subscription found',
          suggestion: 'You must have an active subscription to change plans'
        },
        { status: 404 }
      );
    }

    // Get subscription manager for current billing info
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);
    const currentDisplayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    // Define available plans
    const availablePlans = [
      {
        priceId: 'price_premium_monthly',
        name: 'Premium Monthly',
        amount: 999, // $9.99
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        description: 'Billed monthly',
        features: [
          'Unlimited trades tracking',
          'Advanced analytics',
          'Data export',
          'Priority support'
        ]
      },
      {
        priceId: 'price_premium_yearly',
        name: 'Premium Yearly',
        amount: 9999, // $99.99
        currency: 'usd',
        interval: 'year',
        intervalCount: 1,
        description: 'Billed yearly (2 months free)',
        features: [
          'Unlimited trades tracking',
          'Advanced analytics',
          'Data export',
          'Priority support',
          '17% savings vs monthly'
        ]
      }
    ];

    // Filter out current plan  
    const planOptions = availablePlans
      .filter(plan => plan.priceId !== currentSubscription.stripePriceId)
      .map(plan => ({
        ...plan,
      }));

    const response = {
      canChangePlan: true,
      currentPlan: {
        priceId: currentSubscription.stripePriceId,
        tier: currentSubscription.tier,
        status: currentSubscription.status,
      },
      availablePlans: planOptions,
      billing: {
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
        nextBillingDate: currentSubscription.currentPeriodEnd,
        prorationInfo: {
          description: 'Changes take effect immediately with prorated billing adjustments',
          upgradeChargeImmediate: true,
          downgradeCreditApplied: true,
        }
      },
      planChangeOptions: {
        prorationBehaviors: [
          {
            value: 'create_prorations',
            name: 'Prorate Changes',
            description: 'Create prorations for immediate plan changes (recommended)',
            default: true,
          },
          {
            value: 'none',
            name: 'No Proration',
            description: 'Changes take effect at next billing cycle',
            default: false,
          }
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/subscription/change-plan error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get plan change options' },
      { status: 500 }
    );
  }
}

// Helper function to calculate proration amount
function calculateProration(
  currentAmount: number,
  newAmount: number,
  periodStart: Date,
  periodEnd: Date
): number {
  const now = new Date();
  const totalPeriodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (remainingDays <= 0 || totalPeriodDays <= 0) return 0;
  
  const remainingRatio = remainingDays / totalPeriodDays;
  const priceDifference = newAmount - currentAmount;
  
  return Math.round(priceDifference * remainingRatio);
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