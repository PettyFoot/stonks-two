import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from '@/lib/snaptrade/client';
import { getSnapTradeCredentials } from '@/lib/snaptrade/auth';

// GET - Get user accounts from SnapTrade
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's SnapTrade credentials
    const credentials = await getSnapTradeCredentials(session.user.sub);
    if (!credentials) {
      return NextResponse.json(
        { error: 'SnapTrade credentials not found. Please connect a broker first.' },
        { status: 400 }
      );
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Call SnapTrade listUserAccounts API

    
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });



    return NextResponse.json({
      success: true,
      userId: session.user.sub,
      snapTradeUserId: credentials.snapTradeUserId,
      accounts: accountsResponse.data,
      accountsCount: accountsResponse.data?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching user accounts:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch accounts',
        success: false,
      },
      { status: 500 }
    );
  }
}