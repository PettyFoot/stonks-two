import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { createSubscriptionManager } from '@/lib/stripe/utils';

/**
 * Subscription Management API
 * GET: Get user's current subscription info
 * POST: Manage subscription (cancel, reactivate)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create subscription manager for user
    const subscriptionManager = createSubscriptionManager(session.user.sub);

    // Get subscription display information
    const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    return NextResponse.json(displayInfo);

  } catch (error) {
    console.error('Subscription GET error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Create subscription manager for user
    const subscriptionManager = createSubscriptionManager(session.user.sub);

    let result;

    switch (action) {
      case 'cancel':
        result = await subscriptionManager.cancelSubscription();
        break;

      case 'reactivate':
        result = await subscriptionManager.reactivateSubscription();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: cancel, reactivate' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Action failed' },
        { status: 400 }
      );
    }

    // Return updated subscription info
    const displayInfo = await subscriptionManager.getSubscriptionDisplayInfo();

    return NextResponse.json({
      success: true,
      subscription: displayInfo,
    });

  } catch (error) {
    console.error('Subscription POST error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}