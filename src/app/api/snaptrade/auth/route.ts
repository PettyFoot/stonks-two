import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { createBrokerConnection, isSnapTradeConfigured } from '@/lib/snaptrade';
import { z } from 'zod';

const AuthRequestSchema = z.object({
  redirectUri: z.string().url('Invalid redirect URI'),
});

export async function POST(request: NextRequest) {
  try {
    // Check if SnapTrade is configured
    if (!isSnapTradeConfigured()) {
      return NextResponse.json(
        { error: 'SnapTrade is not configured on this server' },
        { status: 503 }
      );
    }

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
    const { redirectUri } = AuthRequestSchema.parse(body);

    // Create broker connection
    const result = await createBrokerConnection({
      userId: session.user.sub,
      redirectUri,
    });

    return NextResponse.json({
      success: true,
      redirectUri: result.redirectUri,
      snapTradeUserId: result.snapTradeUserId,
      snapTradeUserSecret: result.snapTradeUserSecret,
    });

  } catch (error) {
    console.error('Error initiating SnapTrade auth:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to initiate broker connection' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check SnapTrade configuration status
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      configured: isSnapTradeConfigured(),
      available: true,
    });

  } catch (error) {
    console.error('Error checking SnapTrade status:', error);
    return NextResponse.json(
      { error: 'Failed to check SnapTrade status' },
      { status: 500 }
    );
  }
}