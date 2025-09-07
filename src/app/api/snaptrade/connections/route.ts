import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getSnapTradeBrokerConnections } from '@/lib/snaptrade';

// GET - List all broker connections for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      console.warn('SnapTrade connections endpoint called without valid session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const connections = await getSnapTradeBrokerConnections(session.user.sub);

    return NextResponse.json({
      success: true,
      connections: connections,
      totalCount: connections.length,
    });

  } catch (error) {
    console.error('Error listing connections:', error);
    return NextResponse.json(
      { error: 'Failed to list broker connections' },
      { status: 500 }
    );
  }
}

