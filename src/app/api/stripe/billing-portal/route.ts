import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { createSubscriptionManager } from '@/lib/stripe/utils';

/**
 * Billing Portal Session Creation
 * Creates a Stripe billing portal session for customer self-service
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from database
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('return_url');

    if (!returnUrl) {
      return NextResponse.json(
        { error: 'Missing return_url parameter' },
        { status: 400 }
      );
    }

    // Create subscription manager for user using database ID
    const subscriptionManager = createSubscriptionManager(user.id);

    // Create billing portal session
    const portalResult = await subscriptionManager.createBillingPortalSession(returnUrl);

    if (!portalResult.success || !portalResult.data) {
      return NextResponse.json(
        { error: portalResult.error || 'Failed to create billing portal session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: portalResult.data.url,
    });

  } catch (error) {
    console.error('Billing portal creation error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}