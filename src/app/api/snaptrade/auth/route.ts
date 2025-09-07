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
        { error: 'SnapTrade is 2t configured on this server' },
        { status: 503 }
      );
    }

    // Get user session
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      console.warn('SnapTrade auth endpoint called without valid session');
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
    
    // Log additional error details for debugging
    if (error && typeof error === 'object') {
      console.error('Error details:', {
        message: (error as any).message,
        response: (error as any).response?.data,
        status: (error as any).response?.status,
        stack: (error as any).stack
      });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    // Handle specific SnapTrade API errors
    if (error && typeof error === 'object' && (error as any).response) {
      const apiError = (error as any).response;
      const status = apiError.status || 500;
      const errorMessage = apiError.data?.detail || apiError.data?.message || 'SnapTrade API error';
      
      console.error(`SnapTrade API error ${status}:`, errorMessage);
      
      return NextResponse.json(
        { 
          error: `SnapTrade API error: ${errorMessage}`,
          status: status
        },
        { status: status >= 400 && status < 600 ? status : 500 }
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
      console.warn('SnapTrade status check called without valid session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      configured: isSnapTradeConfigured(),
      available: true,
      authenticated: true,
      userId: session.user.sub
    });

  } catch (error) {
    console.error('Error checking SnapTrade status:', error);
    return NextResponse.json(
      { error: 'Failed to check SnapTrade status' },
      { status: 500 }
    );
  }
}