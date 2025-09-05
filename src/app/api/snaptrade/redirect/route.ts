import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { completeBrokerAuth } from '@/lib/snaptrade';
import { z } from 'zod';

const RedirectRequestSchema = z.object({
  brokerAuthorizationCode: z.string().min(1, 'Authorization code is required'),
  snapTradeUserId: z.string().min(1, 'SnapTrade user ID is required'),
  snapTradeUserSecret: z.string().min(1, 'SnapTrade user secret is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { brokerAuthorizationCode, snapTradeUserId, snapTradeUserSecret } = 
      RedirectRequestSchema.parse(body);

    // Complete broker authorization
    const result = await completeBrokerAuth({
      userId: session.user.sub,
      brokerAuthorizationCode,
      snapTradeUserId,
      snapTradeUserSecret,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete broker authorization' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: result.brokerConnection,
    });

  } catch (error) {
    console.error('Error completing broker auth:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to complete broker authorization' 
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for OAuth redirects (query parameters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Log all parameters for debugging
    console.log('SnapTrade OAuth redirect parameters:', Object.fromEntries(searchParams.entries()));
    
    // Check for SnapTrade-specific parameters
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const brokerAuthorizationId = searchParams.get('brokerAuthorizationId');
    
    // Handle OAuth errors
    if (error || success === 'false') {
      const errorDescription = searchParams.get('error_description') || searchParams.get('message') || 'Unknown error';
      console.error('SnapTrade OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/import?error=${encodeURIComponent(error || 'connection_failed')}&description=${encodeURIComponent(errorDescription)}`, request.url)
      );
    }

    // Handle successful authorization
    if (success === 'true' || brokerAuthorizationId) {
      console.log('SnapTrade OAuth success, redirecting to completion flow');
      
      // For SnapTrade, the success callback indicates the connection was established
      // We need to redirect to a page that will complete the connection setup
      const params = new URLSearchParams();
      if (brokerAuthorizationId) params.set('authId', brokerAuthorizationId);
      
      return NextResponse.redirect(
        new URL(`/import?snaptradeSuccess=true&${params.toString()}`, request.url)
      );
    }

    // Invalid request
    console.warn('Invalid SnapTrade OAuth redirect, no success or error parameter');
    return NextResponse.redirect(
      new URL('/import?error=invalid_request', request.url)
    );

  } catch (error) {
    console.error('Error handling OAuth redirect:', error);
    return NextResponse.redirect(
      new URL('/import?error=server_error', request.url)
    );
  }
}