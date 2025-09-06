import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeCredentials } from '@/lib/snaptrade/auth';
import { getSnapTradeClient, RateLimitHelper, handleSnapTradeError } from '@/lib/snaptrade/client';

// GET - Fetch live broker connections from SnapTrade API
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      console.warn('SnapTrade live connections endpoint called without valid session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's SnapTrade credentials
    const credentials = await getSnapTradeCredentials(session.user.sub);
    if (!credentials) {
      return NextResponse.json({
        success: true,
        connections: [],
        message: 'No SnapTrade credentials found for user',
      });
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Fetch live connections from SnapTrade API
    const authorizationsResponse = await client.connections.listBrokerageAuthorizations({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });

    const authorizations = authorizationsResponse.data || [];

    // Also get account information for each authorization
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });

    const accounts = accountsResponse.data || [];

    // Map authorizations to a consistent format
    const liveConnections = authorizations.map((auth: any) => {
      // Find associated accounts for this brokerage
      const associatedAccounts = accounts.filter((account: any) => 
        account.brokerage_authorization?.id === auth.id
      );

      return {
        id: auth.id,
        snapTradeAuthId: auth.id,
        brokerName: auth.name || 'Unknown Broker',
        type: auth.type || null,
        status: auth.disabled ? 'INACTIVE' : 'ACTIVE',
        accounts: associatedAccounts.map((account: any) => ({
          id: account.id,
          number: account.number,
          name: account.name,
          type: account.meta?.type || null,
          balance: account.balance,
          currency: account.balance?.currency || null,
        })),
        createdAt: auth.created_date,
        updatedAt: auth.updated_date,
        isLiveConnection: true, // Flag to distinguish from database connections
      };
    });

    return NextResponse.json({
      success: true,
      connections: liveConnections,
      totalCount: liveConnections.length,
      snapTradeUserId: credentials.snapTradeUserId,
    });

  } catch (error) {
    console.error('Error fetching live SnapTrade connections:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch live broker connections',
        details: handleSnapTradeError(error)
      },
      { status: 500 }
    );
  }
}