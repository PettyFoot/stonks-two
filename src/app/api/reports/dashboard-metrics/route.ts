import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { 
  calculateDashboardMetrics,
  calculateKellyCriterion,
  calculateSharpeRatio,
  calculateDrawdownMetrics,
  calculateRMultiples,
  calculateMarketConditionPerformance,
  calculateTradeQualityMetrics
} from '@/lib/tradeAggregations';

/**
 * Dashboard Metrics API
 * 
 * Comprehensive endpoint that returns all key trading metrics
 * optimized for dashboard display.
 * 
 * Query Parameters:
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 * - symbol: Stock symbol filter
 * - side: LONG or SHORT filter
 * - metrics: Comma-separated list of specific metrics to return
 * 
 * Performance Notes:
 * - All metrics use database aggregations for optimal performance
 * - Supports selective metric loading to reduce response size
 * - Results are cached at database level via query planning
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const dateTo = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    const symbol = searchParams.get('symbol') || undefined;
    const side = searchParams.get('side') as 'LONG' | 'SHORT' | undefined;
    const requestedMetrics = searchParams.get('metrics')?.split(',') || ['all'];

    // Build filters object
    const filters = {
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(symbol && symbol !== 'all' && { symbol }),
      ...(side && side !== 'all' && { side }),
    };

    // Initialize response object
    const response: any = {};

    // Helper to check if metric is requested
    const isRequested = (metric: string) => 
      requestedMetrics.includes('all') || requestedMetrics.includes(metric);

    // Fetch requested metrics in parallel for optimal performance
    const promises: Promise<any>[] = [];
    const promiseKeys: string[] = [];

    if (isRequested('dashboard')) {
      promiseKeys.push('dashboard');
      promises.push(calculateDashboardMetrics(user.id, filters));
    }

    if (isRequested('kelly')) {
      promiseKeys.push('kelly');
      promises.push(calculateKellyCriterion(user.id, filters));
    }

    if (isRequested('sharpe')) {
      promiseKeys.push('sharpe');
      promises.push(
        Promise.all([
          calculateSharpeRatio(user.id, 'daily', filters),
          calculateSharpeRatio(user.id, 'weekly', filters),
          calculateSharpeRatio(user.id, 'monthly', filters),
        ]).then(([daily, weekly, monthly]) => ({ daily, weekly, monthly }))
      );
    }

    if (isRequested('drawdown')) {
      promiseKeys.push('drawdown');
      promises.push(calculateDrawdownMetrics(user.id, filters));
    }

    if (isRequested('rMultiples')) {
      promiseKeys.push('rMultiples');
      promises.push(calculateRMultiples(user.id, 100, filters)); // $100 default risk
    }

    if (isRequested('marketConditions')) {
      promiseKeys.push('marketConditions');
      promises.push(calculateMarketConditionPerformance(user.id, filters));
    }

    if (isRequested('tradeQuality')) {
      promiseKeys.push('tradeQuality');
      promises.push(calculateTradeQualityMetrics(user.id, filters));
    }

    // Execute all promises in parallel
    const results = await Promise.all(promises);

    // Map results to response object
    promiseKeys.forEach((key, index) => {
      response[key] = results[index];
    });

    // Add metadata
    response.metadata = {
      userId: user.id,
      filters: {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        symbol: symbol || 'all',
        side: side || 'all',
      },
      generatedAt: new Date().toISOString(),
      metricsIncluded: promiseKeys,
    };

    // Format numbers for consistency
    response.formatted = formatMetricsForDisplay(response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    
    // Provide detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      : 'Failed to fetch dashboard metrics';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Format metrics for display with proper number formatting
 */
function formatMetricsForDisplay(metrics: any) {
  const formatted: any = {};

  if (metrics.dashboard) {
    const d = metrics.dashboard;
    formatted.overview = {
      totalTrades: d.total_trades || 0,
      winRate: formatPercent(d.win_rate),
      profitFactor: formatNumber(d.profit_factor, 2),
      expectancy: formatCurrency(d.expectancy),
      totalPnl: formatCurrency(d.total_pnl),
      sharpeRatio: formatNumber(d.sharpe_ratio, 2),
    };

    formatted.performance = {
      bestTrade: formatCurrency(d.best_trade),
      worstTrade: formatCurrency(d.worst_trade),
      avgWin: formatCurrency(d.avg_win),
      avgLoss: formatCurrency(d.avg_loss),
      avgDailyPnl: formatCurrency(d.avg_daily_pnl),
      bestDay: formatCurrency(d.best_day),
      worstDay: formatCurrency(d.worst_day),
    };

    formatted.volume = {
      totalVolume: formatNumber(d.total_volume, 0),
      avgHoldTime: formatDuration(d.avg_hold_time),
      tradingDays: d.trading_days || 0,
    };
  }

  if (metrics.kelly !== undefined) {
    formatted.kelly = {
      percentage: formatPercent(metrics.kelly * 100),
      recommendation: getKellyRecommendation(metrics.kelly),
    };
  }

  if (metrics.drawdown) {
    const dd = metrics.drawdown;
    formatted.drawdown = {
      maxDrawdown: formatCurrency(dd.maxDrawdown),
      maxDrawdownPercent: formatPercent(dd.maxDrawdownPercent),
      currentDrawdown: formatCurrency(dd.currentDrawdown),
      currentDrawdownPercent: formatPercent(dd.currentDrawdownPercent),
      maxDuration: `${dd.maxDrawdownDuration} days`,
      recoveryTime: dd.recoveryTime ? `${dd.recoveryTime} days` : 'N/A',
    };
  }

  return formatted;
}

/**
 * Helper formatting functions
 */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  const formatted = Math.abs(value).toFixed(2);
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0.00%';
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0';
  if (!isFinite(value)) return value > 0 ? '∞' : '-∞';
  return value.toFixed(decimals);
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${Math.floor(seconds)}s`;
}

function getKellyRecommendation(kelly: number): string {
  if (kelly <= 0) return 'No position recommended';
  if (kelly < 0.05) return 'Very small position (< 5%)';
  if (kelly < 0.10) return 'Small position (5-10%)';
  if (kelly < 0.15) return 'Moderate position (10-15%)';
  if (kelly < 0.20) return 'Large position (15-20%)';
  return 'Maximum position (capped at 25%)';
}