import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const referrerFilter = searchParams.get('referrer');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build base filter for referrer
    const referrerWhere = referrerFilter
      ? { referrer: referrerFilter === 'Direct' ? null : referrerFilter }
      : {};

    // 1. Overview Stats
    const totalSessions = await prisma.analyticsSession.count({
      where: referrerWhere,
    });
    const totalPageViews = await prisma.analyticsPageView.count();

    const anonymousSessions = await prisma.analyticsSession.count({
      where: { userId: null, ...referrerWhere },
    });

    const authenticatedSessions = await prisma.analyticsSession.count({
      where: { userId: { not: null }, ...referrerWhere },
    });

    // Recent sessions (last N days)
    const recentSessions = await prisma.analyticsSession.count({
      where: {
        firstSeenAt: { gte: startDate },
        ...referrerWhere,
      },
    });

    // Calculate average session duration
    const sessionsWithDuration = await prisma.analyticsSession.findMany({
      where: referrerWhere,
      select: {
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });

    const avgSessionDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, session) => {
          const duration = new Date(session.lastSeenAt).getTime() - new Date(session.firstSeenAt).getTime();
          return sum + duration;
        }, 0) / sessionsWithDuration.length
      : 0;

    // 2. UTM Source Breakdown
    const utmSourceBreakdown = await prisma.analyticsSession.groupBy({
      by: ['utmSource'],
      where: referrerWhere,
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
    });

    // 3. Reddit-Specific Metrics
    const redditSessions = await prisma.analyticsSession.findMany({
      where: {
        utmSource: 'reddit',
        ...referrerWhere,
      },
      include: {
        pageViews: true,
      },
    });

    const redditStats = {
      totalSessions: redditSessions.length,
      byCampaign: await prisma.analyticsSession.groupBy({
        by: ['utmCampaign'],
        where: { utmSource: 'reddit', ...referrerWhere },
        _count: { sessionId: true },
      }),
      byMedium: await prisma.analyticsSession.groupBy({
        by: ['utmMedium'],
        where: { utmSource: 'reddit', ...referrerWhere },
        _count: { sessionId: true },
      }),
      byContent: await prisma.analyticsSession.groupBy({
        by: ['utmContent'],
        where: { utmSource: 'reddit', ...referrerWhere },
        _count: { sessionId: true },
      }),
      conversions: await prisma.analyticsSession.count({
        where: {
          utmSource: 'reddit',
          userId: { not: null },
          ...referrerWhere,
        },
      }),
      conversionRate: redditSessions.length > 0
        ? (await prisma.analyticsSession.count({
            where: {
              utmSource: 'reddit',
              userId: { not: null },
              ...referrerWhere,
            },
          }) / redditSessions.length) * 100
        : 0,
    };

    // 4. Top Landing Pages
    const topLandingPages = await prisma.analyticsSession.groupBy({
      by: ['landingPage'],
      where: referrerWhere,
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
      take: 10,
    });

    // 5. Top Pages (normalized)
    const topPages = await prisma.analyticsPageView.groupBy({
      by: ['normalizedPath'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // 6. Referrer Breakdown
    const referrerBreakdown = await prisma.analyticsSession.groupBy({
      by: ['referrer'],
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
      take: 10,
    });

    // 7. Recent Activity (last 50 sessions)
    const recentActivity = await prisma.analyticsSession.findMany({
      where: referrerWhere,
      take: 50,
      orderBy: { firstSeenAt: 'desc' },
      select: {
        sessionId: true,
        userId: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        landingPage: true,
        referrer: true,
        firstSeenAt: true,
        lastSeenAt: true,
        pageViews: {
          select: {
            normalizedPath: true,
            enteredAt: true,
            duration: true,
          },
          orderBy: { enteredAt: 'asc' },
        },
      },
    });

    // 8. Sessions over time (daily for last N days)
    const dailySessions = referrerFilter
      ? referrerFilter === 'Direct'
        ? await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
            SELECT
              DATE("firstSeenAt") as date,
              COUNT(*)::int as count
            FROM analytics_sessions
            WHERE "firstSeenAt" >= ${startDate}
              AND "referrer" IS NULL
            GROUP BY DATE("firstSeenAt")
            ORDER BY date ASC
          `
        : await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
            SELECT
              DATE("firstSeenAt") as date,
              COUNT(*)::int as count
            FROM analytics_sessions
            WHERE "firstSeenAt" >= ${startDate}
              AND "referrer" = ${referrerFilter}
            GROUP BY DATE("firstSeenAt")
            ORDER BY date ASC
          `
      : await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT
            DATE("firstSeenAt") as date,
            COUNT(*)::int as count
          FROM analytics_sessions
          WHERE "firstSeenAt" >= ${startDate}
          GROUP BY DATE("firstSeenAt")
          ORDER BY date ASC
        `;

    // 9. Page views over time
    const dailyPageViews = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT
        DATE("enteredAt") as date,
        COUNT(*)::int as count
      FROM analytics_page_views
      WHERE "enteredAt" >= ${startDate}
      GROUP BY DATE("enteredAt")
      ORDER BY date ASC
    `;

    // 10. User Journey Paths (most common path sequences)
    const journeyPaths = referrerFilter
      ? referrerFilter === 'Direct'
        ? await prisma.$queryRaw<Array<{ path: string; count: bigint }>>`
            SELECT
              CONCAT(s."landingPage", ' → ', STRING_AGG(p."normalizedPath", ' → ' ORDER BY p."enteredAt")) as path,
              COUNT(DISTINCT s."sessionId")::int as count
            FROM analytics_sessions s
            LEFT JOIN analytics_page_views p ON s."sessionId" = p."sessionId"
            WHERE s."referrer" IS NULL
            GROUP BY s."sessionId", s."landingPage"
            HAVING COUNT(p.id) > 0
            ORDER BY count DESC
            LIMIT 20
          `
        : await prisma.$queryRaw<Array<{ path: string; count: bigint }>>`
            SELECT
              CONCAT(s."landingPage", ' → ', STRING_AGG(p."normalizedPath", ' → ' ORDER BY p."enteredAt")) as path,
              COUNT(DISTINCT s."sessionId")::int as count
            FROM analytics_sessions s
            LEFT JOIN analytics_page_views p ON s."sessionId" = p."sessionId"
            WHERE s."referrer" = ${referrerFilter}
            GROUP BY s."sessionId", s."landingPage"
            HAVING COUNT(p.id) > 0
            ORDER BY count DESC
            LIMIT 20
          `
      : await prisma.$queryRaw<Array<{ path: string; count: bigint }>>`
          SELECT
            CONCAT(s."landingPage", ' → ', STRING_AGG(p."normalizedPath", ' → ' ORDER BY p."enteredAt")) as path,
            COUNT(DISTINCT s."sessionId")::int as count
          FROM analytics_sessions s
          LEFT JOIN analytics_page_views p ON s."sessionId" = p."sessionId"
          GROUP BY s."sessionId", s."landingPage"
          HAVING COUNT(p.id) > 0
          ORDER BY count DESC
          LIMIT 20
        `;

    return NextResponse.json({
      overview: {
        totalSessions,
        totalPageViews,
        anonymousSessions,
        authenticatedSessions,
        recentSessions,
        avgSessionDurationMs: Math.round(avgSessionDuration),
      },
      utmSources: utmSourceBreakdown.map(item => ({
        source: item.utmSource || 'Direct',
        count: item._count.sessionId,
      })),
      reddit: redditStats,
      topLandingPages: topLandingPages.map(item => ({
        page: item.landingPage,
        count: item._count.sessionId,
      })),
      topPages: topPages.map(item => ({
        page: item.normalizedPath,
        count: item._count.id,
      })),
      referrers: referrerBreakdown.map(item => ({
        referrer: item.referrer || 'Direct',
        count: item._count.sessionId,
      })),
      recentActivity: recentActivity.map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        utmSource: session.utmSource,
        utmMedium: session.utmMedium,
        utmCampaign: session.utmCampaign,
        landingPage: session.landingPage,
        referrer: session.referrer,
        firstSeenAt: session.firstSeenAt,
        lastSeenAt: session.lastSeenAt,
        pageViews: session.pageViews.length,
        journey: session.pageViews.map(pv => pv.normalizedPath).join(' → '),
        duration: new Date(session.lastSeenAt).getTime() - new Date(session.firstSeenAt).getTime(),
      })),
      timeSeries: {
        dailySessions: dailySessions.map(item => ({
          date: item.date,
          count: Number(item.count),
        })),
        dailyPageViews: dailyPageViews.map(item => ({
          date: item.date,
          count: Number(item.count),
        })),
      },
      journeyPaths: journeyPaths.map(item => ({
        path: item.path,
        count: Number(item.count),
      })),
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
