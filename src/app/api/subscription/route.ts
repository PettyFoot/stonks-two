import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { createSubscriptionManager } from '@/lib/stripe/utils';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { z } from 'zod';
import { extractCSRFToken, validateCSRFToken, generateCSRFToken, getCSRFResponseHeaders } from '@/lib/utils/csrf';

// Request validation schemas
const subscriptionActionSchema = z.object({
  action: z.enum(['cancel', 'reactivate', 'change-plan']),
  planId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/subscription
 * Get user's current subscription status and details
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user (supports both Auth0 and demo)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Log request for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] GET /api/subscription - User: ${user.id}`);
    }

    // Get subscription data with optimized single query using relations
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        subscriptions: {
          where: {
            status: {
              not: SubscriptionStatus.CANCELED
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            stripeSubscriptionId: true,
            stripeCustomerId: true,
            stripePriceId: true,
            tier: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            canceledAt: true,
            trialStart: true,
            trialEnd: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });
    
    const dbSubscription = dbUser?.subscriptions?.[0] || null;

    // If no database subscription found, return free tier status
    if (!dbSubscription) {
      const response = {
        subscription: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.INACTIVE,
          isActive: false,
          isTrial: false,
          isFreeTier: true,
          hasValidPaymentMethod: false,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          nextBillingDate: null,
          trialDaysRemaining: 0,
        },
        features: {
          maxTrades: 100, // Free tier limit
          advancedAnalytics: false,
          dataExport: false,
          prioritySupport: false,
          customReports: false,
        },
        usage: {
          tradesThisMonth: 0, // Will be calculated separately if needed
        },
        billing: {
          amount: null,
          currency: null,
          interval: null,
          nextInvoiceAmount: null,
          paymentMethod: null,
        },
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            queryTime: Date.now() - startTime,
            userId: user.id,
            dbUserTier: dbUser?.subscriptionTier,
            dbUserStatus: dbUser?.subscriptionStatus,
          }
        })
      };

      return NextResponse.json(response);
    }

    // Get enhanced subscription info from Stripe if we have a subscription
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);
    const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    // Determine if subscription is active
    const isActive = dbSubscription.status === SubscriptionStatus.ACTIVE;
    const isTrial = dbSubscription.trialStart && dbSubscription.trialEnd && 
                   new Date() <= dbSubscription.trialEnd;
    const isFreeTier = dbSubscription.tier === SubscriptionTier.FREE;
    
    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (isTrial && dbSubscription.trialEnd) {
      const trialEnd = new Date(dbSubscription.trialEnd);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Get next billing date
    let nextBillingDate = null;
    if (isActive && !dbSubscription.cancelAtPeriodEnd) {
      nextBillingDate = dbSubscription.currentPeriodEnd;
    }

    const response = {
      subscription: {
        id: dbSubscription.id,
        stripeSubscriptionId: dbSubscription.stripeSubscriptionId,
        tier: dbSubscription.tier,
        status: dbSubscription.status,
        isActive,
        isTrial,
        isFreeTier,
        hasValidPaymentMethod: displayInfo.billing?.paymentMethod !== null,
        currentPeriodStart: dbSubscription.currentPeriodStart,
        currentPeriodEnd: dbSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: dbSubscription.cancelAtPeriodEnd,
        canceledAt: dbSubscription.canceledAt,
        nextBillingDate,
        trialDaysRemaining,
      },
      features: {
        maxTrades: isFreeTier ? 100 : -1, // Unlimited for premium
        advancedAnalytics: !isFreeTier,
        dataExport: !isFreeTier,
        prioritySupport: !isFreeTier,
        customReports: !isFreeTier,
        realTimeData: !isFreeTier,
        portfolioTracking: !isFreeTier,
      },
      billing: displayInfo.billing,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          subscriptionId: dbSubscription.id,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] GET /api/subscription completed in ${Date.now() - startTime}ms`);
    }

    // Generate CSRF token for future POST requests
    const csrfToken = generateCSRFToken(user.id);
    const headers = getCSRFResponseHeaders(csrfToken);

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('[API] GET /api/subscription error:', error);
    
    const errorResponse = {
      error: 'Failed to fetch subscription',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/subscription  
 * Manage subscription actions (cancel, reactivate, change-plan)
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

    // CSRF Protection for state-changing operations
    const csrfToken = extractCSRFToken(request.headers);
    const csrfValidation = validateCSRFToken(csrfToken || '', user.id);
    
    if (!csrfValidation.valid) {
      console.warn(`[SECURITY] CSRF validation failed for user ${user.id}: ${csrfValidation.reason}`);
      
      // Generate new token for expired tokens
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

    // Validate request data
    const validationResult = subscriptionActionSchema.safeParse(body);
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

    const { action, planId, cancelAtPeriodEnd, metadata } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/subscription - User: ${user.id}, Action: ${action}`);
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { not: SubscriptionStatus.CANCELED }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Create subscription manager
    const subscriptionManager = createSubscriptionManager(user.auth0Id || user.id);

    let result;

    // Handle different actions
    switch (action) {
      case 'cancel':
        result = await subscriptionManager.cancelSubscription(cancelAtPeriodEnd);
        break;

      case 'reactivate':
        result = await subscriptionManager.reactivateSubscription();
        break;

      case 'change-plan':
        if (!planId) {
          return NextResponse.json(
            { error: 'planId is required for change-plan action' },
            { status: 400 }
          );
        }
        result = await subscriptionManager.changeSubscriptionPlan(planId, metadata);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: cancel, reactivate, change-plan' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Action failed',
          code: result.code || 'SUBSCRIPTION_ACTION_FAILED'
        },
        { status: 400 }
      );
    }

    // Get updated subscription info
    const updatedDisplayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    // Log successful action
    if (process.env.NODE_ENV === 'production') {
      console.log(`[SUBSCRIPTION] User ${user.id} performed ${action} on subscription ${currentSubscription.stripeSubscriptionId}`);
    }

    const response = {
      success: true,
      action,
      subscription: updatedDisplayInfo,
      message: getSuccessMessage(action),
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          subscriptionId: currentSubscription.id,
        }
      })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] POST /api/subscription error:', error);
    
    const errorResponse = {
      error: 'Failed to process subscription action',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Helper function to get success messages
function getSuccessMessage(action: string): string {
  switch (action) {
    case 'cancel':
      return 'Subscription has been scheduled for cancellation';
    case 'reactivate':
      return 'Subscription has been reactivated successfully';
    case 'change-plan':
      return 'Subscription plan has been updated successfully';
    default:
      return 'Subscription action completed successfully';
  }
}

// Only allow GET and POST methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for subscription actions.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with action: "cancel" to cancel subscription.' },
    { status: 405 }
  );
}