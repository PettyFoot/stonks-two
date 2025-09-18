import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const LogsQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// GET - Get sync logs with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const validatedParams = LogsQuerySchema.parse(queryParams);

    // Build where clause
    const whereClause: any = {};
    if (validatedParams.userId) {
      whereClause.userId = validatedParams.userId;
    }
    if (validatedParams.status) {
      whereClause.status = validatedParams.status;
    }

    // Get sync logs with user information
    const [logs, totalCount] = await Promise.all([
      prisma.snapTradeSync.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        take: validatedParams.limit,
        skip: validatedParams.offset
      }),
      prisma.snapTradeSync.count({ where: whereClause })
    ]);

    // Format the response
    const formattedLogs = logs.map(log => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.user.email,
      connectionId: log.connectionId,
      syncType: log.syncType,
      status: log.status,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      activitiesFound: log.activitiesFound,
      ordersCreated: log.ordersCreated,
      orderIds: log.orderIds,
      dataReturned: log.dataReturned,
      dateRange: log.dateRange,
      errors: log.errors,
      duration: log.completedAt && log.startedAt
        ? Math.round((log.completedAt.getTime() - log.startedAt.getTime()) / 1000)
        : null
    }));

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        total: totalCount,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        hasMore: validatedParams.offset + validatedParams.limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching SnapTrade logs:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch sync logs' },
      { status: 500 }
    );
  }
}