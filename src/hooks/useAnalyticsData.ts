'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, ReportsFilterOptions, WinLossMetrics, PerformanceMetrics, StandardTimeframe, PredefinedTimeframe } from '@/types';
import { getDateRangeFromTimeframe } from '@/contexts/GlobalFilterContext';

interface UseAnalyticsDataReturn {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  errorType: 'network' | 'validation' | 'api' | 'parsing' | null;
  refetch: () => void;
  retryCount: number;
}

interface VolumeAnalysisData {
  data: Array<{
    period: string;
    shares: number;
    normalizedDailyVolume?: number;
    winRate: number;
  }>;
}

interface PerformanceData {
  byMonth?: Array<{ period: string; pnl: number; winRate: number; trades: number; sharpeRatio?: number }>;
  byWeek?: Array<{ period: string; pnl: number; winRate: number; trades: number }>;
  byDay?: Array<{ date: string; pnl: number; winRate: number; trades: number; cumulativePnl?: number }>;
  byHour?: Array<{ hour: number; avgPnl: number; winRate: number; trades: number }>;
}

interface StatisticsData {
  overall?: {
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
    kellyPercentage?: number;
    systemQualityNumber?: number;
    avgPerSharePnl?: number;
  };
}

interface TimeIntervalsData {
  averagedDailyPnl?: number;
}

interface ApiResponse {
  metadata: {
    dateRange: { start: string; end: string };
    totalTrades: number;
    cacheHit: boolean;
    computeTime: number;
    lastUpdated: string;
  };
  distribution?: unknown;
  performance?: PerformanceData;
  statistics?: StatisticsData;
  timeAnalysis?: unknown;
  volumeAnalysis?: VolumeAnalysisData;
  timeIntervals?: TimeIntervalsData;
}

// Helper function to standardize date formatting for charts
const standardizeDateFormat = (dateValue: string | Date): string => {
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue.toString();
    
    // Return ISO date string (YYYY-MM-DD format) for consistency
    return date.toISOString().split('T')[0];
  } catch {
    return dateValue.toString();
  }
};

// Helper function to get effective timeframe (priority: filter > custom > standard)
const getEffectiveTimeframe = (standardTimeframe: StandardTimeframe, filters: ReportsFilterOptions): PredefinedTimeframe => {
  // Priority 1: Filter timeframe
  if (filters.predefinedTimeframe) {
    return filters.predefinedTimeframe;
  }
  
  // Priority 2: Custom date range (use standard as fallback for display)
  if (filters.customTimeRange && (filters.dateFrom || filters.dateTo)) {
    return standardTimeframe; // For display purposes, show the standard timeframe when custom dates are used
  }
  
  // Priority 3: Standard timeframe
  return standardTimeframe;
};

// Helper function to calculate win/loss day metrics
const calculateWinLossMetrics = (dailyPnlData: Array<{ date: string; value: number }>, overallStats: StatisticsData['overall']): WinLossMetrics => {
  // Separate days by win/loss
  const winningDays = dailyPnlData.filter(day => day.value > 0);
  const losingDays = dailyPnlData.filter(day => day.value < 0);
  const breakEvenDays = dailyPnlData.filter(day => day.value === 0);

  // Helper to create default metrics when no data
  const createDefaultMetrics = (): PerformanceMetrics => ({
    totalPnl: 0,
    totalTrades: 0,
    winRate: 0,
    lossRate: 0,
    avgWin: 0,
    avgLoss: 0,
    avgDailyPnl: 0,
    avgTradePnl: 0,
    largestGain: 0,
    largestLoss: 0,
    winningTrades: 0,
    losingTrades: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    avgHoldTime: '0',
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    kellyPercentage: 0,
    systemQualityNumber: 0,
    totalCommissions: 0,
    totalFees: 0,
    avgPerSharePnl: 0,
  });

  // Calculate metrics for winning days
  const winningDaysMetrics: PerformanceMetrics = winningDays.length > 0 ? {
    totalPnl: winningDays.reduce((sum, day) => sum + day.value, 0),
    totalTrades: Math.round((overallStats?.totalVolume || 0) * (winningDays.length / dailyPnlData.length)),
    winRate: 100, // All days in this group are winning
    lossRate: 0,
    avgWin: winningDays.reduce((sum, day) => sum + day.value, 0) / winningDays.length,
    avgLoss: 0,
    avgDailyPnl: winningDays.reduce((sum, day) => sum + day.value, 0) / winningDays.length,
    avgTradePnl: winningDays.reduce((sum, day) => sum + day.value, 0) / Math.max(1, Math.round((overallStats?.totalVolume || 0) * (winningDays.length / dailyPnlData.length))),
    largestGain: Math.max(...winningDays.map(day => day.value)),
    largestLoss: 0,
    winningTrades: Math.round((overallStats?.totalVolume || 0) * (winningDays.length / dailyPnlData.length)),
    losingTrades: 0,
    maxConsecutiveWins: winningDays.length,
    maxConsecutiveLosses: 0,
    avgHoldTime: overallStats?.avgDailyPnl ? '4h' : '0',
    profitFactor: winningDays.length > 0 ? 999 : 0, // Infinite since no losses
    sharpeRatio: overallStats?.sharpeRatio || 0,
    maxDrawdown: 0,
    kellyPercentage: overallStats?.kellyPercentage || 0,
    systemQualityNumber: overallStats?.systemQualityNumber || 0,
    totalCommissions: (overallStats?.totalCommissions || 0) * (winningDays.length / dailyPnlData.length),
    totalFees: (overallStats?.totalFees || 0) * (winningDays.length / dailyPnlData.length),
    avgPerSharePnl: overallStats?.avgPerSharePnl || 0,
  } : createDefaultMetrics();

  // Calculate metrics for losing days
  const losingDaysMetrics: PerformanceMetrics = losingDays.length > 0 ? {
    totalPnl: losingDays.reduce((sum, day) => sum + day.value, 0),
    totalTrades: Math.round((overallStats?.totalVolume || 0) * (losingDays.length / dailyPnlData.length)),
    winRate: 0,
    lossRate: 100, // All days in this group are losing
    avgWin: 0,
    avgLoss: losingDays.reduce((sum, day) => sum + day.value, 0) / losingDays.length,
    avgDailyPnl: losingDays.reduce((sum, day) => sum + day.value, 0) / losingDays.length,
    avgTradePnl: losingDays.reduce((sum, day) => sum + day.value, 0) / Math.max(1, Math.round((overallStats?.totalVolume || 0) * (losingDays.length / dailyPnlData.length))),
    largestGain: 0,
    largestLoss: Math.min(...losingDays.map(day => day.value)),
    winningTrades: 0,
    losingTrades: Math.round((overallStats?.totalVolume || 0) * (losingDays.length / dailyPnlData.length)),
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: losingDays.length,
    avgHoldTime: overallStats?.avgDailyPnl ? '4h' : '0',
    profitFactor: 0, // No wins to divide by
    sharpeRatio: overallStats?.sharpeRatio || 0,
    maxDrawdown: Math.abs(Math.min(...losingDays.map(day => day.value))),
    kellyPercentage: overallStats?.kellyPercentage || 0,
    systemQualityNumber: overallStats?.systemQualityNumber || 0,
    totalCommissions: (overallStats?.totalCommissions || 0) * (losingDays.length / dailyPnlData.length),
    totalFees: (overallStats?.totalFees || 0) * (losingDays.length / dailyPnlData.length),
    avgPerSharePnl: overallStats?.avgPerSharePnl || 0,
  } : createDefaultMetrics();

  return {
    winningDays: winningDaysMetrics,
    losingDays: losingDaysMetrics,
    dayCount: {
      winning: winningDays.length,
      losing: losingDays.length,
      breakeven: breakEvenDays.length,
      total: dailyPnlData.length,
    },
  };
};

export const useAnalyticsData = (standardTimeframe: StandardTimeframe, filters: ReportsFilterOptions): UseAnalyticsDataReturn => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'network' | 'validation' | 'api' | 'parsing' | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Memoize the filters and timeframe to prevent unnecessary re-renders
  const memoizedParams = useMemo(() => ({ standardTimeframe, filters }), [standardTimeframe, JSON.stringify(filters)]);

  const fetchAnalyticsData = async (isRetry: boolean = false) => {
    setLoading(true);
    setError(null);
    setErrorType(null);
    
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    } else {
      setRetryCount(0);
    }

    try {
      // Calculate date range using effective timeframe (priority: filter > custom > standard)
      const effectiveTimeframe = getEffectiveTimeframe(standardTimeframe, filters);
      
      let dateRange: { start: Date; end: Date };
      
      // If custom date range is provided, use it
      if (filters.customTimeRange && (filters.dateFrom || filters.dateTo)) {
        const start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = filters.dateTo ? new Date(filters.dateTo) : new Date();
        dateRange = { start, end };
      } else {
        // Use effective timeframe for date calculation
        dateRange = getDateRangeFromTimeframe(effectiveTimeframe);
      }

      const requestBody = {
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
          preset: effectiveTimeframe,
        },
        filters: {
          symbols: filters.symbols,
          tags: filters.tags,
          side: filters.side?.toUpperCase() as 'LONG' | 'SHORT' | undefined,
          timeZone: 'America/New_York',
        },
        aggregations: ['distribution', 'performance', 'statistics', 'time_analysis', 'volume_analysis', 'time_intervals'],
        realTimeUpdates: true,
      };

      const response = await fetch('/api/reports/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `Analytics API error: ${response.status}`;
        let errorCategory: 'network' | 'validation' | 'api' | 'parsing' = 'api';
        
        if (response.status >= 500) {
          errorMessage = 'Server error - analytics data temporarily unavailable';
          errorCategory = 'network';
        } else if (response.status === 400) {
          errorMessage = 'Invalid request parameters';
          errorCategory = 'validation';
        } else if (response.status === 401) {
          errorMessage = 'Authentication required';
          errorCategory = 'validation';
        } else if (response.status === 404) {
          errorMessage = 'Analytics endpoint not found';
          errorCategory = 'api';
        }
        
        const error = new Error(errorMessage);
        (error as Error & { category: string }).category = errorCategory;
        throw error;
      }

      let result: ApiResponse;
      try {
        result = await response.json();
      } catch (_parseError) {
        const error = new Error('Failed to parse response data');
        (error as Error & { category: string }).category = 'parsing';
        throw error;
      }
      
      // Debug: Log the API response to understand what data we're getting
      console.log('Analytics API Response:', {
        performance: result.performance,
        statistics: result.statistics,
        volumeAnalysis: (result as ApiResponse & { volumeAnalysis?: unknown }).volumeAnalysis,
        timeIntervals: (result as ApiResponse & { timeIntervals?: unknown }).timeIntervals,
        metadata: result.metadata
      });
      
      // Transform API response to our AnalyticsData format with fallbacks
      const transformedData: AnalyticsData = {
        overview: {
          // Daily P&L: Use averaged daily P&L from timeIntervals, fallback to regular performance data
          dailyPnl: result.timeIntervals?.averagedDailyPnl !== undefined ? [
            { 
              date: standardizeDateFormat(new Date()), 
              value: result.timeIntervals.averagedDailyPnl 
            }
          ] : result.performance?.byDay && result.performance.byDay.length > 0 ? 
            result.performance.byDay.map(item => ({
              date: standardizeDateFormat(item.date),
              value: item.pnl
            })) : [
              { date: standardizeDateFormat(new Date()), value: result.statistics?.overall?.totalPnl || 0 }
            ],
          
          // Cumulative P&L: Use performance.byDay with cumulative calculation
          cumulativePnl: result.performance?.byDay && result.performance.byDay.length > 0 ? 
            result.performance.byDay.reduce((acc, item, index) => {
              const cumulative = index === 0 ? item.pnl : acc[index - 1].value + item.pnl;
              acc.push({ date: standardizeDateFormat(item.date), value: cumulative });
              return acc;
            }, [] as Array<{ date: string; value: number }>) : [
              { date: standardizeDateFormat(new Date()), value: result.statistics?.overall?.totalPnl || 0 }
            ],
            
          // Daily Volume: Use volumeAnalysis data with normalized volume (shares per day), fallback to total volume
          dailyVolume: result.volumeAnalysis?.data && result.volumeAnalysis.data.length > 0 ? 
            result.volumeAnalysis.data.map(item => ({
              date: standardizeDateFormat(item.period),
              value: item.normalizedDailyVolume || item.shares // Use normalized volume if available
            })) : result.performance?.byDay && result.performance.byDay.length > 0 ? 
            result.performance.byDay.map(item => ({
              date: standardizeDateFormat(item.date),
              value: item.trades * 100 // Approximate volume as trades * 100
            })) : [
              { date: standardizeDateFormat(new Date()), value: result.statistics?.overall?.totalVolume || 0 }
            ],
            
          // Win Percentage: Use volumeAnalysis data for time-based win rates, fallback to performance data
          winPercentage: result.volumeAnalysis?.data && result.volumeAnalysis.data.length > 0 ? 
            result.volumeAnalysis.data.map(item => ({
              date: standardizeDateFormat(item.period),
              value: item.winRate
            })) : result.performance?.byDay && result.performance.byDay.length > 0 ? 
            result.performance.byDay.map(item => ({
              date: standardizeDateFormat(item.date),
              value: item.winRate || 0
            })) : [
              { date: standardizeDateFormat(new Date()), value: result.statistics?.overall?.winRate || 0 }
            ],
        },
        distribution: {
          // Note: distribution data is not returned by the API, using fallback
          byMonth: [
            { category: 'No Trade Data', count: 0, percentage: 0, pnl: 0, avgPnl: 0 }
          ],
          byDayOfWeek: [
            { category: 'No Trade Data', count: 0, percentage: 0, pnl: 0, avgPnl: 0 }
          ],
          byHourOfDay: [
            { category: 'No Trade Data', count: 0, percentage: 0, pnl: 0, avgPnl: 0 }
          ],
          byDuration: [
            { category: 'No Trade Data', count: 0, percentage: 0, pnl: 0, avgPnl: 0 }
          ],
          byIntradayDuration: [
            { category: 'No Trade Data', count: 0, percentage: 0, pnl: 0, avgPnl: 0 }
          ],
        },
        performance: {
          byMonth: result.performance?.byMonth?.map(item => ({
            date: item.period,
            value: item.pnl
          })) || [
            { date: 'No Data', value: 0 }
          ],
          byDayOfWeek: result.performance?.byWeek?.map(item => ({
            date: item.period,
            value: item.pnl
          })) || [
            { date: 'No Data', value: 0 }
          ],
          byHourOfDay: result.performance?.byHour?.map(item => ({
            date: `${item.hour}:00`,
            value: item.avgPnl
          })) || [
            { date: 'No Data', value: 0 }
          ],
          byDuration: [
            { date: 'No Data', value: 0 }
          ],
          byIntradayDuration: [
            { date: 'No Data', value: 0 }
          ],
        },
        statistics: {
          totalPnl: result.statistics?.overall?.totalPnl || 0,
          totalTrades: result.metadata.totalTrades,
          winRate: result.statistics?.overall?.winRate || 0,
          lossRate: result.statistics?.overall?.winRate ? (100 - result.statistics.overall.winRate) : 0,
          avgWin: result.statistics?.overall?.avgWin || 0,
          avgLoss: result.statistics?.overall?.avgLoss || 0,
          avgDailyPnl: result.statistics?.overall?.avgDailyPnl || 0,
          avgTradePnl: result.metadata.totalTrades > 0 ? (result.statistics?.overall?.totalPnl || 0) / result.metadata.totalTrades : 0,
          largestGain: result.statistics?.overall?.avgWin || 0,
          largestLoss: result.statistics?.overall?.avgLoss || 0,
          winningTrades: result.metadata.totalTrades > 0 ? Math.round((result.statistics?.overall?.winRate || 0) / 100 * result.metadata.totalTrades) : 0,
          losingTrades: result.metadata.totalTrades > 0 ? Math.round((100 - (result.statistics?.overall?.winRate || 0)) / 100 * result.metadata.totalTrades) : 0,
          maxConsecutiveWins: result.statistics?.overall?.maxConsecutiveWins || 0,
          maxConsecutiveLosses: result.statistics?.overall?.maxConsecutiveLosses || 0,
          avgHoldTime: '0',
          profitFactor: result.statistics?.overall?.profitFactor || 0,
          sharpeRatio: result.statistics?.overall?.sharpeRatio || 0,
          maxDrawdown: result.statistics?.overall?.maxDrawdown || 0,
          kellyPercentage: 0,
          systemQualityNumber: 0,
          totalCommissions: result.statistics?.overall?.totalCommissions || 0,
          totalFees: result.statistics?.overall?.totalFees || 0,
          avgPerSharePnl: result.statistics?.overall?.avgPositionSize ? (result.statistics.overall.totalPnl / result.statistics.overall.avgPositionSize) : 0,
        },
        timeframe: {
          start: new Date(result.metadata.dateRange.start),
          end: new Date(result.metadata.dateRange.end),
          period: effectiveTimeframe,
        },
        winLossStats: calculateWinLossMetrics(
          result.performance?.byDay && result.performance.byDay.length > 0 ? 
            result.performance.byDay.map(item => ({
              date: standardizeDateFormat(item.date),
              value: item.pnl
            })) : [
              { date: standardizeDateFormat(new Date()), value: result.statistics?.overall?.totalPnl || 0 }
            ],
          result.statistics?.overall
        ),
      };

      setData(transformedData);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network connection failed. Please check your internet connection.');
        setErrorType('network');
      } else if (err instanceof Error) {
        setError(err.message);
        setErrorType((err as Error & { category?: 'network' | 'validation' | 'api' | 'parsing' }).category || 'api');
      } else {
        setError('Unknown error occurred while fetching analytics data');
        setErrorType('api');
      }
    } finally {
      setLoading(false);
    }
  };

  // Refetch function with retry logic
  const refetch = () => {
    const isRetry = retryCount > 0;
    fetchAnalyticsData(isRetry);
  };

  // Fetch data when filters or timeframe change
  useEffect(() => {
    fetchAnalyticsData();
  }, [memoizedParams]);

  return {
    data,
    loading,
    error,
    errorType,
    refetch,
    retryCount,
  };
};

// Utility function to transform chart data for different chart libraries
export const transformChartData = (data: Array<Record<string, unknown>>, _type: 'bar' | 'line' | 'distribution') => {
  if (!data || !Array.isArray(data)) return [];

  return data.map((item, index) => ({
    id: index,
    date: item.date || item.category || item.label,
    value: item.value || item.pnl || item.count,
    label: item.label,
    count: item.count,
    percentage: item.percentage,
    color: item.value >= 0 ? '#16A34A' : '#DC2626', // Green for positive, red for negative
  }));
};