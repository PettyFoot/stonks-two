import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from '@/lib/snaptrade/client';
import { getSnapTradeCredentials, getSnapTradeBrokerConnections } from '@/lib/snaptrade/auth';

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

    // Get user's broker connections from SnapTrade API
    const connections = await getSnapTradeBrokerConnections(session.user.sub);
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
      if (connection.status !== 'ACTIVE' || !connection.accounts?.length) {

        continue;
      }

      // Process each account in this connection
      for (const account of connection.accounts) {
        try {

          
          const holdingsResponse = await client.accountInformation.getUserHoldings({
            userId: credentials.snapTradeUserId,
            userSecret: credentials.snapTradeUserSecret,
            accountId: account.id,
          });



          holdingsData.push({
            connectionId: connection.id,
            brokerName: connection.brokerName,
            accountId: account.id,
            accountName: account.name || account.number,
            holdings: holdingsResponse.data,
          });

        } catch (error) {
          console.error(`Error fetching holdings for account ${account.id}:`, error);
          holdingsData.push({
            connectionId: connection.id,
            brokerName: connection.brokerName,
            accountId: account.id,
            accountName: account.name || account.number,
            error: handleSnapTradeError(error),
          });
        }
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