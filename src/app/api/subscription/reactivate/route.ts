import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { createSubscriptionManager } from '@/lib/stripe/utils';
import { SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';

// Request validation schema
const reactivateSubscriptionSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/subscription/reactivate
 * Reactivate a cancelled subscription
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
      // Allow empty body for simple reactivation
      body = {};
    }

    const validationResult = reactivateSubscriptionSchema.safeParse(body);
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

    const { metadata = {} } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/subscription/reactivate - User: ${user.id}`);
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCELED,
            SubscriptionStatus.PAST_DUE
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { 
          error: 'No subscription found to reactivate',
          code: 'NO_SUBSCRIPTION_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if subscription is eligible for reactivation
    if (currentSubscription.status === SubscriptionStatus.ACTIVE && !currentSubscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        {
          error: 'Subscription is already active',
          subscription: {
            id: currentSubscription.id,
            status: currentSubscription.status,
            cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd
          }
        },
        { status: 409 }
      );
    }

    // Check if subscription is past its period end
    const now = new Date();
    const isExpired = currentSubscription.status === SubscriptionStatus.CANCELED && 
                     currentSubscription.currentPeriodEnd < now;

    if (isExpired) {
      return NextResponse.json(
        {
          error: 'Subscription has expired and cannot be reactivated. Please create a new subscription.',
          expiredAt: currentSubscription.currentPeriodEnd,
          code: 'SUBSCRIPTION_EXPIRED',
          suggestion: 'Create a new subscription at /api/subscription/create'
        },
        { status: 410 }
      );
    }

    // Create subscription manager
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);

    // Perform reactivation
    const reactivateResult = await subscriptionManager.reactivateSubscription({
      userId: user.id,
      reactivatedBy: 'user',
      reactivatedAt: new Date().toISOString(),
      ...metadata
    });

    if (!reactivateResult.success) {
      return NextResponse.json(
        {
          error: reactivateResult.error || 'Failed to reactivate subscription',
          code: reactivateResult.code || 'REACTIVATION_FAILED'
        },
        { status: 400 }
      );
    }

    // Update local database
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        updatedAt: new Date(),
      }
    });

    // Get updated subscription info
    const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    // Calculate access details
    const periodEnd = currentSubscription.currentPeriodEnd;
    const daysRemaining = Math.max(0,
      Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Log successful reactivation
    if (process.env.NODE_ENV === 'production') {
      console.log(`[SUBSCRIPTION] User ${user.id} reactivated subscription ${currentSubscription.stripeSubscriptionId}`);
    }

    const response = {
      success: true,
      reactivated: true,
      subscription: displayInfo,
      accessDetails: {
        immediateAccess: true,
        accessUntil: periodEnd,
        daysRemaining,
        nextBillingDate: periodEnd,
      },
      message: 'Subscription reactivated successfully. You now have full access to all premium features.',
      restoredFeatures: [
        'Unlimited trades tracking',
        'Advanced analytics and reports',
        'Data export capabilities',
        'Priority customer support',
        'Custom report generation',
        'Real-time market data',
        'Portfolio performance tracking',
      ],
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          subscriptionId: currentSubscription.id,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/subscription/reactivate completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] POST /api/subscription/reactivate error:', error);
    
    // Enhanced error logging for reactivation failures
    if (error instanceof Error) {
      console.error('[SUBSCRIPTION_REACTIVATE_ERROR]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    const errorResponse = {
      error: 'Failed to reactivate subscription',
      code: 'REACTIVATION_FAILED',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/subscription/reactivate
 * Check if subscription can be reactivated and get reactivation details
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

    // Get current subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tier: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        canceledAt: true,
        stripeSubscriptionId: true,
      }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { 
          canReactivate: false,
          reason: 'No subscription found',
          suggestion: 'Create a new subscription',
          createUrl: '/api/subscription/create'
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const isExpired = currentSubscription.status === SubscriptionStatus.CANCELED && 
                     currentSubscription.currentPeriodEnd < now;

    // Already active
    if (currentSubscription.status === SubscriptionStatus.ACTIVE && !currentSubscription.cancelAtPeriodEnd) {
      return NextResponse.json({
        canReactivate: false,
        reason: 'Subscription is already active',
        subscription: {
          id: currentSubscription.id,
          status: currentSubscription.status,
          tier: currentSubscription.tier,
        }
      });
    }

    // Expired subscription
    if (isExpired) {
      return NextResponse.json({
        canReactivate: false,
        reason: 'Subscription has expired',
        expiredAt: currentSubscription.currentPeriodEnd,
        suggestion: 'Create a new subscription',
        createUrl: '/api/subscription/create'
      });
    }

    // Can reactivate
    const daysRemaining = Math.max(0,
      Math.ceil((currentSubscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Get subscription manager for billing info
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);
    const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    const response = {
      canReactivate: true,
      subscription: {
        id: currentSubscription.id,
        tier: currentSubscription.tier,
        status: currentSubscription.status,
        isScheduledForCancellation: currentSubscription.cancelAtPeriodEnd,
        canceledAt: currentSubscription.canceledAt,
      },
      reactivationDetails: {
        willRestoreAccess: true,
        accessUntil: currentSubscription.currentPeriodEnd,
        daysRemaining,
        nextBillingDate: currentSubscription.currentPeriodEnd,
        billingWillResume: true,
      },
      billing: displayInfo.billing,
      featuresYouWillRegain: [
        'Unlimited trades tracking',
        'Advanced analytics and reports',
        'Data export capabilities',
        'Priority customer support',
        'Custom report generation',
        'Real-time market data',
        'Portfolio performance tracking',
      ],
      currentRestrictions: [
        'Limited to 100 trades per month',
        'Basic analytics only',
        'No data export',
        'Standard support only',
      ]
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/subscription/reactivate error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get reactivation information' },
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