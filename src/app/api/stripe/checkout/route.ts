import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { subscriptionService, STRIPE_CONFIG } from '@/lib/stripe';
import { createSubscriptionManager } from '@/lib/stripe/utils';

/**
 * Create Stripe Checkout Session
 * Creates a checkout session for premium subscription
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
    const successUrl = searchParams.get('success_url');
    const cancelUrl = searchParams.get('cancel_url');

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing success_url or cancel_url parameters' },
        { status: 400 }
      );
    }

    // Create subscription manager for user using database ID
    const subscriptionManager = createSubscriptionManager(user.id);

    // Check if user already has active subscription
    const currentSubscription = await subscriptionManager.getCurrentSubscription();
    
    if (currentSubscription.success && currentSubscription.data) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 409 }
      );
    }

    // Create checkout session with user email
    const checkoutResult = await subscriptionManager.createPremiumCheckoutSession(
      successUrl,
      cancelUrl,
      user.email
    );

    if (!checkoutResult.success || !checkoutResult.data) {
      return NextResponse.json(
        { error: checkoutResult.error || 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: checkoutResult.data.url,
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    
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