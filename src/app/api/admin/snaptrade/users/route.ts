import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';

// GET - List users with SnapTrade connections
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get users with SnapTrade connections
    const usersWithSnapTrade = await prisma.user.findMany({
      where: {
        snapTradeUserId: { not: null }
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        snapTradeUserId: true,
        autoSyncEnabled: true,
        // Get latest sync info
        snapTradeSyncs: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            activitiesFound: true,
            ordersCreated: true,
            dataReturned: true,
            errors: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format the response
    const formattedUsers = usersWithSnapTrade.map(user => {
      const latestSync = user.snapTradeSyncs[0] || null;

      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        hasSnapTradeConnection: !!user.snapTradeUserId,
        snapTradeUserId: user.snapTradeUserId,
        autoSyncEnabled: user.autoSyncEnabled,
        lastSync: latestSync ? {
          id: latestSync.id,
          status: latestSync.status,
          startedAt: latestSync.startedAt,
          completedAt: latestSync.completedAt,
          activitiesFound: latestSync.activitiesFound,
          ordersCreated: latestSync.ordersCreated,
          dataReturned: latestSync.dataReturned,
          hasErrors: latestSync.errors ? Array.isArray(latestSync.errors) && latestSync.errors.length > 0 : false
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      totalUsers: formattedUsers.length
    });

  } catch (error) {
    console.error('Error fetching SnapTrade users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}