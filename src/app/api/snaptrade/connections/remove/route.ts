import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeCredentials } from '@/lib/snaptrade/auth';
import { getSnapTradeClient, RateLimitHelper, handleSnapTradeError } from '@/lib/snaptrade/client';
import { z } from 'zod';

const RemoveSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
});

// DELETE - Remove a SnapTrade connection
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      console.warn('SnapTrade remove endpoint called without valid session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { connectionId } = RemoveSchema.parse(body);

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

    // Remove the brokerage authorization using SnapTrade API
    await client.connections.removeBrokerageAuthorization({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
      authorizationId: connectionId,
    });

    return NextResponse.json({
      success: true,
      message: 'Broker connection removed successfully',
    });

  } catch (error) {
    console.error('Error removing SnapTrade connection:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to remove broker connection',
        details: handleSnapTradeError(error)
      },
      { status: 500 }
    );
  }
}