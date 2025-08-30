import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { webhookService } from '@/lib/stripe';
import { rateLimit, RATE_LIMIT_CONFIGS } from '@/lib/utils/rateLimit';

/**
 * Stripe Webhook Handler
 * Handles incoming webhook events from Stripe
 * 
 * Important: This endpoint must be configured in your Stripe dashboard
 * Webhook URL: https://yourdomain.com/api/stripe/webhook
 * 
 * Events to listen for:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - checkout.session.completed
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 * - customer.created
 * - customer.updated
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') 
      || request.headers.get('x-real-ip') 
      || '127.0.0.1';
    
    // Apply rate limiting for webhook endpoints
    const webhookRateAllowed = await rateLimit(
      `webhook:${clientIP}`, 
      50, // Max 50 webhook requests per minute
      60 * 1000 // 1 minute window
    );
    
    if (!webhookRateAllowed) {
      console.warn(`[SECURITY] Webhook rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded for webhook endpoint' },
        { status: 429 }
      );
    }
    
    // Get the raw body as text (required for webhook signature verification)
    const body = await request.text();
    
    // Get the Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing Stripe signature header' },
        { status: 400 }
      );
    }

    // Additional rate limiting based on signature to prevent replay attacks
    const signatureHash = signature.split(',')[0]?.replace('t=', '') || 'unknown';
    const signatureRateAllowed = await rateLimit(
      `webhook:sig:${signatureHash}`,
      5, // Max 5 requests per signature
      30 * 1000 // 30 second window
    );
    
    if (!signatureRateAllowed) {
      console.warn(`[SECURITY] Potential webhook replay attack detected for signature: ${signatureHash}`);
      return NextResponse.json(
        { error: 'Webhook signature rate limit exceeded' },
        { status: 429 }
      );
    }

    // Process the webhook event
    const result = await webhookService.processWebhook(body, signature);

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json({
      received: true,
      processed: result.data?.processed,
      eventType: result.data?.eventType,
    });

  } catch (error) {
    console.error('Webhook endpoint error:', error);
    
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