import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { createSubscriptionManager } from '@/lib/stripe/utils';
import { SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';

// Request validation schema
const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().optional().default(false),
  reason: z.string().optional(),
  feedback: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/subscription/cancel
 * Cancel user's active subscription
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
      // Allow empty body for simple cancellation
      body = {};
    }

    const validationResult = cancelSubscriptionSchema.safeParse(body);
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

    const { immediately, reason, feedback, metadata = {} } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/subscription/cancel - User: ${user.id}, Immediately: ${immediately}`);
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
          error: 'No active subscription found to cancel',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        },
        { status: 404 }
      );
    }

    // Check if subscription is already scheduled for cancellation
    if (currentSubscription.cancelAtPeriodEnd && !immediately) {
      return NextResponse.json(
        {
          error: 'Subscription is already scheduled for cancellation',
          cancelAt: currentSubscription.currentPeriodEnd,
          canCancelImmediately: true
        },
        { status: 409 }
      );
    }

    // Create subscription manager
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);

    // Perform cancellation
    const cancelResult = await subscriptionManager.cancelSubscription(
      !immediately, // cancelAtPeriodEnd
      {
        reason,
        feedback,
        userId: user.id,
        canceledBy: 'user',
        canceledAt: new Date().toISOString(),
        ...metadata
      }
    );

    if (!cancelResult.success) {
      return NextResponse.json(
        {
          error: cancelResult.error || 'Failed to cancel subscription',
          code: cancelResult.code || 'CANCELLATION_FAILED'
        },
        { status: 400 }
      );
    }

    // Log cancellation feedback if provided
    if (reason || feedback) {
      if (process.env.NODE_ENV === 'production') {
        console.log(`[SUBSCRIPTION_FEEDBACK] User ${user.id} cancelled subscription:`, {
          subscriptionId: currentSubscription.stripeSubscriptionId,
          reason,
          feedback,
          immediately,
        });
      }
    }

    // Update local database
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (immediately) {
      updateData.status = SubscriptionStatus.CANCELED;
      updateData.canceledAt = new Date();
    } else {
      updateData.cancelAtPeriodEnd = true;
    }

    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: updateData
    });

    // Get updated subscription info
    const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    // Calculate access remaining
    const accessEndsAt = immediately 
      ? new Date() 
      : currentSubscription.currentPeriodEnd;

    const daysRemaining = Math.max(0, 
      Math.ceil((accessEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    );

    const response = {
      success: true,
      cancelled: true,
      immediately,
      subscription: displayInfo,
      accessDetails: {
        accessEndsAt,
        daysRemaining,
        willLoseAccessImmediately: immediately,
        canStillUseUntil: immediately ? null : accessEndsAt,
      },
      message: immediately
        ? 'Subscription cancelled immediately. Access has been revoked.'
        : `Subscription cancelled. You will retain access until ${accessEndsAt.toLocaleDateString()}.`,
      nextSteps: immediately
        ? 'Your account has been downgraded to the free tier.'
        : 'You can reactivate your subscription anytime before the end of your billing period.',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          subscriptionId: currentSubscription.id,
          cancelReason: reason,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/subscription/cancel completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] POST /api/subscription/cancel error:', error);
    
    // Enhanced error logging for cancellation failures
    if (error instanceof Error) {
      console.error('[SUBSCRIPTION_CANCEL_ERROR]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    const errorResponse = {
      error: 'Failed to cancel subscription',
      code: 'CANCELLATION_FAILED',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/subscription/cancel
 * Get cancellation preview information
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
          error: 'No active subscription found',
          canCancel: false
        },
        { status: 404 }
      );
    }

    // Calculate what the user will lose
    const now = new Date();
    const periodEnd = currentSubscription.currentPeriodEnd;
    const daysRemaining = Math.max(0,
      Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Get subscription manager for billing info
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);
    const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    const response = {
      canCancel: true,
      subscription: {
        id: currentSubscription.id,
        tier: currentSubscription.tier,
        status: currentSubscription.status,
        isAlreadyScheduledForCancellation: currentSubscription.cancelAtPeriodEnd,
      },
      cancellationOptions: {
        cancelAtPeriodEnd: {
          available: true,
          accessUntil: periodEnd,
          daysRemaining,
          description: `Keep access until ${periodEnd.toLocaleDateString()}`,
          recommended: true,
        },
        cancelImmediately: {
          available: true,
          accessUntil: now,
          daysRemaining: 0,
          description: 'Lose access immediately',
          recommended: false,
        },
      },
      billing: displayInfo.billing,
      whatYouWillLose: [
        'Unlimited trades tracking',
        'Advanced analytics and reports',
        'Data export capabilities',
        'Priority customer support', 
        'Custom report generation',
        'Real-time market data',
        'Portfolio performance tracking',
      ],
      whatYouWillKeep: [
        'Access to up to 100 trades per month',
        'Basic trade tracking',
        'Standard support',
        'Your existing trade data',
      ],
      reactivation: {
        available: true,
        description: 'You can reactivate anytime before your access ends',
        willRestoreFullAccess: true,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/subscription/cancel error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get cancellation information' },
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