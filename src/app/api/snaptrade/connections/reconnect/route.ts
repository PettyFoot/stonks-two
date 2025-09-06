import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeCredentials } from '@/lib/snaptrade/auth';
import { getSnapTradeClient, RateLimitHelper, handleSnapTradeError } from '@/lib/snaptrade/client';
import { z } from 'zod';

const ReconnectSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
});

// POST - Reconnect a SnapTrade connection
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      console.warn('SnapTrade reconnect endpoint called without valid session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    ReconnectSchema.parse(body);

    // Get user's SnapTrade credentials
    const credentials = await getSnapTradeCredentials(session.user.sub);
    if (!credentials) {
      return NextResponse.json(
        { error: 'No SnapTrade credentials found for user' },
        { status: 404 }
      );
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Get login URL for reconnection - this generates a new auth URL
    const authResponse = await client.authentication.loginSnapTradeUser({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });

    // Extract redirect URI from response
    const loginResponse = authResponse.data as any;
    const redirectUri = loginResponse.redirectURI || loginResponse.redirectUri || loginResponse.redirectURL || loginResponse.authenticationLoginURL;

    if (!redirectUri) {
      console.error('No redirect URI found in reconnect response. Full response:', JSON.stringify(loginResponse, null, 2));
      throw new Error('Failed to get redirect URI for reconnection. Check API credentials and configuration.');
    }

    return NextResponse.json({
      success: true,
      redirectUri,
      message: 'Reconnection URL generated successfully',
    });

  } catch (error) {
    console.error('Error reconnecting SnapTrade connection:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to reconnect broker connection',
        details: handleSnapTradeError(error)
      },
      { status: 500 }
    );
  }
}