import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { deleteSnapTradeUser } from '@/lib/snaptrade';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await deleteSnapTradeUser(session.user.sub);

    return NextResponse.json({
      success: true,
      message: 'All broker connections disconnected successfully',
    });

  } catch (error) {
    console.error('Error disconnecting brokers:', error);
    
    if (error instanceof Error && error.message === 'SnapTrade credentials not found') {
      return NextResponse.json(
        { error: 'No broker connections found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to disconnect brokers' },
      { status: 500 }
    );
  }
}

// Alternative DELETE method
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await deleteSnapTradeUser(session.user.sub);

    return NextResponse.json({
      success: true,
      message: 'All broker connections disconnected successfully',
    });

  } catch (error) {
    console.error('Error disconnecting brokers:', error);
    
    if (error instanceof Error && error.message === 'SnapTrade credentials not found') {
      return NextResponse.json(
        { error: 'No broker connections found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to disconnect brokers' },
      { status: 500 }
    );
  }
}