import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { SubscriptionTier } from '@prisma/client';
import { z } from 'zod';

// Request validation schema for usage tracking
const trackUsageSchema = z.object({
  feature: z.enum([
    'trade_import',
    'report_generation', 
    'data_export',
    'advanced_analytics',
    'api_call',
    'chart_generation',
    'custom_report'
  ]),
  quantity: z.number().int().positive().default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/usage
 * Get user's current usage statistics and limits
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current_month';
    const feature = searchParams.get('feature');

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] GET /api/usage - User: ${user.id}, Period: ${period}, Feature: ${feature}`);
    }

    // Get user's current subscription
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { not: 'CANCELED' }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        tier: true,
        status: true,
      }
    });

    const subscriptionTier = currentSubscription?.tier || SubscriptionTier.FREE;
    const isFreeTier = subscriptionTier === SubscriptionTier.FREE;

    // Define date range based on period
    let startDate: Date;
    const endDate: Date = new Date();

    switch (period) {
      case 'current_month':
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_30_days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'current_year':
        startDate = new Date();
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all_time':
        startDate = new Date('2020-01-01'); // Reasonable start date
        break;
      default:
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
    }

    // Build where clause for trades
    const whereClause: Record<string, unknown> = {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate,
      }
    };

    // Execute parallel queries for different usage metrics
    const [tradeStats, dayDataStats, recordsStats] = await Promise.all([
      // Trade-related usage
      prisma.trade.aggregate({
        where: whereClause,
        _count: { id: true },
        _sum: { 
          pnl: true, 
          quantity: true,
          commission: true,
          fees: true,
        },
      }),

      // Daily aggregation usage
      prisma.dayData.aggregate({
        where: {
          userId: user.id,
          date: {
            gte: startDate,
            lte: endDate,
          }
        },
        _count: { id: true },
        _sum: {
          pnl: true,
          trades: true,
          volume: true,
          commissions: true,
        },
        _avg: {
          winRate: true,
        }
      }),

      // Records entries
      prisma.recordsEntry.aggregate({
        where: {
          userId: user.id,
          date: {
            gte: startDate,
            lte: endDate,
          }
        },
        _count: { id: true },
      })
    ]);

    // Get unique symbols traded
    const uniqueSymbols = await prisma.trade.findMany({
      where: whereClause,
      select: { symbol: true },
      distinct: ['symbol'],
    });

    // Calculate limits based on subscription tier
    const limits = {
      trades: isFreeTier ? 100 : -1, // Unlimited for premium
      dataExports: isFreeTier ? 5 : -1,
      customReports: isFreeTier ? 3 : -1,
      apiCalls: isFreeTier ? 1000 : -1,
      advancedAnalytics: isFreeTier ? false : true,
    };

    // Calculate usage percentages
    const usage = {
      trades: {
        used: tradeStats._count.id || 0,
        limit: limits.trades,
        percentage: limits.trades > 0 ? Math.min(100, ((tradeStats._count.id || 0) / limits.trades) * 100) : 0,
        unlimited: limits.trades === -1,
      },
      volume: {
        total: tradeStats._sum.quantity || 0,
        totalPnL: tradeStats._sum.pnl ? Number(tradeStats._sum.pnl) : 0,
        totalFees: Number(tradeStats._sum.commission || 0) + Number(tradeStats._sum.fees || 0),
      },
      symbols: {
        unique: uniqueSymbols.length,
        list: uniqueSymbols.map(s => s.symbol),
      },
      analytics: {
        dayDataEntries: dayDataStats._count.id || 0,
        recordsEntries: recordsStats._count.id || 0,
        averageWinRate: dayDataStats._avg.winRate || 0,
        enabled: !isFreeTier,
      },
      features: {
        dataExport: {
          available: !isFreeTier || (tradeStats._count.id || 0) < limits.dataExports,
          used: 0, // Would track actual exports if implemented
          limit: limits.dataExports,
        },
        customReports: {
          available: !isFreeTier || recordsStats._count.id < limits.customReports,
          used: recordsStats._count.id || 0,
          limit: limits.customReports,
        },
        advancedAnalytics: {
          available: limits.advancedAnalytics,
          unlimited: !isFreeTier,
        }
      }
    };

    const response = {
      period,
      periodRange: {
        startDate,
        endDate,
      },
      subscription: {
        tier: subscriptionTier,
        isFreeTier,
      },
      usage,
      limits,
      warnings: [] as Array<{ type: string; message: string; severity: string; }>, // Will be populated based on usage
      recommendations: [] as Array<{ type: string; message: string; action: string; benefits: string[]; }>, // Premium upgrade recommendations
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          queriedPeriod: period,
        }
      })
    };

    // Add warnings for approaching limits
    if (isFreeTier) {
      if (usage.trades.percentage >= 80) {
        response.warnings.push({
          type: 'trade_limit_warning',
          message: `You've used ${usage.trades.used} of ${limits.trades} monthly trades (${usage.trades.percentage.toFixed(1)}%)`,
          severity: usage.trades.percentage >= 95 ? 'critical' : 'warning',
        });
      }

      if (usage.trades.percentage >= 90) {
        response.recommendations.push({
          type: 'upgrade_suggestion',
          message: 'Upgrade to Premium for unlimited trades and advanced features',
          action: 'upgrade',
          benefits: ['Unlimited trades', 'Advanced analytics', 'Data export', 'Priority support'],
        });
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] GET /api/usage completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/usage error:', error);
    
    const errorResponse = {
      error: 'Failed to fetch usage statistics',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/usage/track
 * Track feature usage (for rate limiting and analytics)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = trackUsageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        },
        { status: 400 }
      );
    }

    const { feature, quantity, metadata = {} } = validationResult.data;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/usage/track - User: ${user.id}, Feature: ${feature}, Quantity: ${quantity}`);
    }

    // Get user's current subscription for limits checking
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { not: 'CANCELED' }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        tier: true,
        status: true,
      }
    });

    const subscriptionTier = currentSubscription?.tier || SubscriptionTier.FREE;
    const isFreeTier = subscriptionTier === SubscriptionTier.FREE;

    // Check feature-specific limits for free tier users
    if (isFreeTier) {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Check trade limits
      if (feature === 'trade_import') {
        const currentMonthTrades = await prisma.trade.count({
          where: {
            userId: user.id,
            date: {
              gte: currentMonth,
            }
          }
        });

        if (currentMonthTrades >= 100) {
          return NextResponse.json(
            {
              error: 'Monthly trade limit exceeded',
              limit: 100,
              used: currentMonthTrades,
              upgradeRequired: true,
              feature,
            },
            { status: 429 }
          );
        }
      }

      // Check data export limits
      if (feature === 'data_export') {
        // This would check against a usage tracking table if implemented
        // For now, we'll allow it but log for future implementation
        console.log(`[USAGE_TRACKING] User ${user.id} used data export feature`);
      }

      // Check report generation limits
      if (feature === 'custom_report') {
        const currentMonthReports = await prisma.recordsEntry.count({
          where: {
            userId: user.id,
            date: {
              gte: currentMonth,
            }
          }
        });

        if (currentMonthReports >= 3) {
          return NextResponse.json(
            {
              error: 'Monthly custom report limit exceeded',
              limit: 3,
              used: currentMonthReports,
              upgradeRequired: true,
              feature,
            },
            { status: 429 }
          );
        }
      }
    }

    // Log usage for analytics (in production, this might go to a separate analytics service)
    if (process.env.NODE_ENV === 'production') {
      console.log(`[FEATURE_USAGE] User ${user.id} used ${feature} (quantity: ${quantity})`, {
        subscriptionTier,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }

    // Here you could implement actual usage tracking in a separate table
    // For now, we'll just return success

    const response = {
      success: true,
      tracked: {
        feature,
        quantity,
        timestamp: new Date(),
      },
      user: {
        subscriptionTier,
        isFreeTier,
      },
      message: 'Feature usage tracked successfully',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          userId: user.id,
          feature,
          quantity,
        }
      })
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[API] POST /api/usage/track error:', error);
    
    const errorResponse = {
      error: 'Failed to track feature usage',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Only allow GET and POST methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}