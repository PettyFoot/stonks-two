import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { CacheService } from '@/lib/services/cacheService';

export interface AnalyticsRequest {
  dateRange?: {
    start: string;
    end: string;
    preset?: '30d' | '60d' | '90d' | '1w' | '2w' | '1m' | '3m' | '6m' | 'last-year' | 'ytd' | 'yesterday';
  };
  filters?: {
    symbols?: string[];
    tags?: string[];
    side?: 'LONG' | 'SHORT';
    timeZone?: string;
  };
  aggregations: ('distribution' | 'performance' | 'statistics' | 'time_analysis' | 'volume_analysis' | 'time_intervals')[];
  realTimeUpdates?: boolean;
}

export interface AnalyticsResponse {
  metadata: {
    dateRange: { start: string; end: string };
    totalTrades: number;
    cacheHit: boolean;
    computeTime: number;
    lastUpdated: string;
  };
  distribution?: {
    monthOfYear: Array<{ month: number; trades: number; pnl: number; winRate: number }>;
    dayOfWeek: Array<{ day: string; trades: number; pnl: number; winRate: number }>;
    hourOfDay: Array<{ hour: number; trades: number; pnl: number; winRate: number }>;
    duration: Array<{ bracket: string; trades: number; pnl: number; avgDuration: number }>;
    intradayDuration: Array<{ bracket: string; trades: number; pnl: number; avgDuration: number }>;
  };
  performance?: {
    byMonth: Array<{ period: string; pnl: number; winRate: number; trades: number; sharpeRatio: number }>;
    byWeek: Array<{ period: string; pnl: number; winRate: number; trades: number }>;
    byDay: Array<{ date: string; pnl: number; winRate: number; trades: number; cumulativePnl: number }>;
    byHour: Array<{ hour: number; avgPnl: number; winRate: number; trades: number }>;
  };
  statistics?: {
    overall: {
      totalPnl: number;
      avgDailyPnl: number;
      winRate: number;
      avgWin: number;
      avgLoss: number;
      maxConsecutiveWins: number;
      maxConsecutiveLosses: number;
      profitFactor: number;
      sharpeRatio: number;
      maxDrawdown: number;
      totalVolume: number;
      avgPositionSize: number;
      totalCommissions: number;
      totalFees: number;
    };
    timeBasedMetrics: {
      bestHour: { hour: number; avgPnl: number };
      worstHour: { hour: number; avgPnl: number };
      bestDayOfWeek: { day: string; avgPnl: number };
      worstDayOfWeek: { day: string; avgPnl: number };
      bestMonth: { month: number; avgPnl: number };
      worstMonth: { month: number; avgPnl: number };
    };
  };
  timeAnalysis?: {
    sessionAnalysis: {
      preMarket: { trades: number; pnl: number; winRate: number };
      regular: { trades: number; pnl: number; winRate: number };
      afterHours: { trades: number; pnl: number; winRate: number };
    };
    holdingPeriodAnalysis: {
      scalp: { trades: number; pnl: number; winRate: number; avgDuration: number };
      intraday: { trades: number; pnl: number; winRate: number; avgDuration: number };
      swing: { trades: number; pnl: number; winRate: number; avgDuration: number };
      position: { trades: number; pnl: number; winRate: number; avgDuration: number };
      longTerm: { trades: number; pnl: number; winRate: number; avgDuration: number };
    };
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const user = await getCurrentUser();
    
    // Return authentication error if no user found
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to access analytics data.' },
        { status: 401 }
      );
    }

    let body: AnalyticsRequest;
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Comprehensive input validation
    if (!body.aggregations || !Array.isArray(body.aggregations) || body.aggregations.length === 0) {
      return NextResponse.json(
        { error: 'At least one aggregation type must be specified' },
        { status: 400 }
      );
    }

    const validAggregations = ['distribution', 'performance', 'statistics', 'time_analysis', 'volume_analysis', 'time_intervals'];
    const invalidAggregations = body.aggregations.filter(agg => !validAggregations.includes(agg));
    if (invalidAggregations.length > 0) {
      return NextResponse.json(
        { error: `Invalid aggregation types: ${invalidAggregations.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate date range if provided
    if (body.dateRange) {
      if (body.dateRange.start && isNaN(Date.parse(body.dateRange.start))) {
        return NextResponse.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        );
      }
      if (body.dateRange.end && isNaN(Date.parse(body.dateRange.end))) {
        return NextResponse.json(
          { error: 'Invalid end date format' },
          { status: 400 }
        );
      }
      if (body.dateRange.start && body.dateRange.end) {
        const startDate = new Date(body.dateRange.start);
        const endDate = new Date(body.dateRange.end);
        if (startDate > endDate) {
          return NextResponse.json(
            { error: 'Start date cannot be after end date' },
            { status: 400 }
          );
        }
      }
    }

    // Validate filters if provided
    if (body.filters) {
      if (body.filters.symbols && !Array.isArray(body.filters.symbols)) {
        return NextResponse.json(
          { error: 'Symbols filter must be an array' },
          { status: 400 }
        );
      }
      if (body.filters.tags && !Array.isArray(body.filters.tags)) {
        return NextResponse.json(
          { error: 'Tags filter must be an array' },
          { status: 400 }
        );
      }
      if (body.filters.side && !['LONG', 'SHORT'].includes(body.filters.side)) {
        return NextResponse.json(
          { error: 'Side filter must be either LONG or SHORT' },
          { status: 400 }
        );
      }
    }

    // Initialize services
    const analyticsService = new AnalyticsService(user.id);
    const cacheService = new CacheService();

    // Generate cache key based on request parameters
    const cacheKey = cacheService.generateAnalyticsCacheKey(user.id, body);
    
    // Try to get from cache first
    let cacheHit = false;
    const cachedResult = await cacheService.getAnalytics(cacheKey);
    
    if (cachedResult && !body.realTimeUpdates) {
      cacheHit = true;
      return NextResponse.json({
        ...cachedResult,
        metadata: {
          ...cachedResult.metadata,
          cacheHit,
          computeTime: Date.now() - startTime
        }
      });
    }

    // Parse date range
    const dateRange = analyticsService.parseDateRange(body.dateRange, body.filters?.timeZone);
    
    // Build base query filters
    const where = analyticsService.buildWhereClause(dateRange, body.filters);

    // Execute aggregations in parallel
    const results = await Promise.allSettled([
      body.aggregations.includes('distribution') 
        ? analyticsService.calculateDistributionMetrics(where, body.filters?.timeZone)
        : Promise.resolve(null),
      body.aggregations.includes('performance')
        ? analyticsService.calculatePerformanceMetrics(where, body.filters?.timeZone)
        : Promise.resolve(null),
      body.aggregations.includes('statistics')
        ? analyticsService.calculateStatistics(where)
        : Promise.resolve(null),
      body.aggregations.includes('time_analysis')
        ? analyticsService.calculateTimeAnalysis(where, body.filters?.timeZone)
        : Promise.resolve(null),
      body.aggregations.includes('volume_analysis')
        ? analyticsService.calculateVolumeMetrics(where, dateRange)
        : Promise.resolve(null),
      body.aggregations.includes('time_intervals')
        ? analyticsService.calculateTimeIntervalData(where, dateRange)
        : Promise.resolve(null)
    ]);

    // Get trade count for metadata
    const totalTrades = await prisma.trade.count({ where });

    // Process results
    const response: AnalyticsResponse = {
      metadata: {
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        },
        totalTrades,
        cacheHit,
        computeTime: Date.now() - startTime,
        lastUpdated: new Date().toISOString()
      }
    };

    // Add successful results to response - map results to correct aggregation types
    const aggregationTypes = [
      'distribution', 'performance', 'statistics', 'time_analysis', 'volume_analysis', 'time_intervals'
    ];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const aggregationType = aggregationTypes[index];
        if (body.aggregations.includes(aggregationType as 'distribution' | 'performance' | 'statistics' | 'time_analysis' | 'volume_analysis' | 'time_intervals')) {
          switch (aggregationType) {
            case 'distribution':
              response.distribution = result.value as AnalyticsResponse['distribution'];
              break;
            case 'performance':
              response.performance = result.value as AnalyticsResponse['performance'];
              break;
            case 'statistics':
              response.statistics = result.value as AnalyticsResponse['statistics'];
              break;
            case 'time_analysis':
              response.timeAnalysis = result.value as AnalyticsResponse['timeAnalysis'];
              break;
            case 'volume_analysis':
              (response as AnalyticsResponse & { volumeAnalysis?: unknown }).volumeAnalysis = result.value;
              break;
            case 'time_intervals':
              (response as AnalyticsResponse & { timeIntervals?: unknown }).timeIntervals = result.value;
              break;
          }
        }
      }
    });

    // Cache the result for future requests (TTL: 5 minutes for real-time, 1 hour for historical)
    const cacheTtl = body.realTimeUpdates ? 300 : 3600;
    await cacheService.setAnalytics(cacheKey, response, cacheTtl);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analytics API error:', error);
    
    // Return detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      {
        error: 'Failed to calculate analytics',
        ...(isDevelopment && { details: error instanceof Error ? error.message : String(error) })
      },
      { status: 500 }
    );
  }
}

// GET endpoint for simple analytics queries with URL parameters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Convert URL params to POST body format
    const body: AnalyticsRequest = {
      dateRange: {
        start: searchParams.get('start') || '',
        end: searchParams.get('end') || '',
        preset: (searchParams.get('preset') as '30d' | '60d' | '90d' | '1w' | '2w' | '1m' | '3m' | '6m' | 'last-year' | 'ytd' | 'yesterday') || '30d'
      },
      aggregations: (searchParams.get('aggregations')?.split(',') as ('distribution' | 'performance' | 'statistics' | 'time_analysis' | 'volume_analysis' | 'time_intervals')[]) || ['statistics'],
      filters: {
        symbols: searchParams.get('symbols')?.split(','),
        tags: searchParams.get('tags')?.split(','),
        side: searchParams.get('side') as 'LONG' | 'SHORT' | undefined,
        timeZone: searchParams.get('timeZone') || 'America/New_York'
      }
    };

    // Reuse POST logic
    const response = await POST(new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: request.headers
    }));

    return response;

  } catch (error) {
    console.error('Analytics GET API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}