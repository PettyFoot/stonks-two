import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from '@/lib/snaptrade/client';
import { getSnapTradeCredentials } from '@/lib/snaptrade/auth';
import { listBrokerConnections } from '@/lib/snaptrade/auth';

// GET - Get user holdings from SnapTrade
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

    // Get user's broker connections to find account IDs
    const connections = await listBrokerConnections(session.user.sub);
    if (connections.length === 0) {
      return NextResponse.json(
        { error: 'No broker connections found. Please connect a broker first.' },
        { status: 400 }
      );
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Get holdings for all connected accounts
    const holdingsData = [];
    
    for (const connection of connections) {
      if (connection.status !== 'ACTIVE' || !connection.accountId) {
        console.log(`Skipping inactive connection ${connection.id}`);
        continue;
      }

      try {
        console.log(`Fetching holdings for account: ${connection.accountId}`);
        
        const holdingsResponse = await client.accountInformation.getUserHoldings({
          userId: credentials.snapTradeUserId,
          userSecret: credentials.snapTradeUserSecret,
          accountId: connection.accountId,
        });

        console.log('Holdings response for account', connection.accountId, ':', holdingsResponse.data);

        holdingsData.push({
          connectionId: connection.id,
          brokerName: connection.brokerName,
          accountId: connection.accountId,
          accountName: connection.accountName,
          holdings: holdingsResponse.data,
        });

      } catch (error) {
        console.error(`Error fetching holdings for connection ${connection.id}:`, error);
        holdingsData.push({
          connectionId: connection.id,
          brokerName: connection.brokerName,
          accountId: connection.accountId,
          accountName: connection.accountName,
          error: handleSnapTradeError(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      userId: session.user.sub,
      snapTradeUserId: credentials.snapTradeUserId,
      connectionsCount: connections.length,
      holdingsData,
    });

  } catch (error) {
    console.error('Error fetching user holdings:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch holdings',
        success: false,
      },
      { status: 500 }
    );
  }
}