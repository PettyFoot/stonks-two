'use client';

import { useState, useEffect } from 'react';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';

interface DetailedReportsData {
  // Statistics
  stats: {
    totalGainLoss: number;
    largestGain: number;
    largestLoss: number;
    avgDailyGainLoss: number;
    avgDailyVolume: number;
    avgPerShareGainLoss: number;
    avgTradeGainLoss: number;
    avgWinningTrade: number;
    avgLosingTrade: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgHoldTimeScratch: string;
    avgHoldTimeWinning: string;
    avgHoldTimeLosing: string;
    scratchTrades: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
    tradePnlStdDev: number;
    profitFactor: number;
    totalCommissions: number;
    totalFees: number;
  };
  // Raw trades for chart calculations
  trades: Array<Record<string, unknown>>;
  loading: boolean;
  error: string | null;
}

export function useDetailedReportsData() {
  const { toFilterOptions } = useGlobalFilters();
  const [data, setData] = useState<DetailedReportsData>({
    stats: {
      totalGainLoss: 0,
      largestGain: 0,
      largestLoss: 0,
      avgDailyGainLoss: 0,
      avgDailyVolume: 0,
      avgPerShareGainLoss: 0,
      avgTradeGainLoss: 0,
      avgWinningTrade: 0,
      avgLosingTrade: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgHoldTimeScratch: '0s',
      avgHoldTimeWinning: '0s',
      avgHoldTimeLosing: '0s',
      scratchTrades: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      tradePnlStdDev: 0,
      profitFactor: 0,
      totalCommissions: 0,
      totalFees: 0
    },
    trades: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    async function fetchDetailedData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        const filters = toFilterOptions();
        const params = new URLSearchParams();
        
        // Add filter parameters
        if (filters.dateFrom) params.append('from', filters.dateFrom);
        if (filters.dateTo) params.append('to', filters.dateTo);
        if (filters.symbol) params.append('symbol', filters.symbol);
        if (filters.side && filters.side !== 'all') params.append('side', filters.side);
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
        if (filters.duration && filters.duration !== 'all') params.append('duration', filters.duration);

        // Fetch detailed reports data from real API
        const response = await fetch(`/api/reports/detailed?${params}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch detailed reports');
        }
        
        const result = await response.json();
        
        setData({
          stats: result.stats,
          trades: result.trades,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching detailed reports data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch detailed reports data'
        }));
      }
    }

    fetchDetailedData();
  }, [toFilterOptions]);

  return data;
}

// Mock data generator - kept for reference but no longer used
// async function generateMockDetailedData(filters: any): Promise<DetailedReportsData> {
/*
  // Generate mock trades
  const numTrades = 150;
  const trades = Array.from({ length: numTrades }, (_, i) => {
    const entryDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    entryDate.setHours(7 + Math.floor(Math.random() * 14));
    
    const pnl = (Math.random() - 0.45) * 500; // Slightly positive bias
    const timeInTrade = Math.floor(Math.random() * 7200); // 0 to 2 hours
    
    return {
      id: `trade-${i}`,
      entryDate: entryDate.toISOString(),
      exitDate: new Date(entryDate.getTime() + timeInTrade * 1000).toISOString(),
      date: entryDate.toISOString(),
      pnl,
      timeInTrade,
      symbol: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'][Math.floor(Math.random() * 5)],
      quantity: Math.floor(Math.random() * 100) + 10,
      commission: Math.random() * 5,
      fees: Math.random() * 2,
      status: 'CLOSED',
      side: Math.random() > 0.5 ? 'LONG' : 'SHORT'
    };
  });

  // Calculate statistics from trades
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const scratchTrades = trades.filter(t => t.pnl === 0);
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalCommissions = trades.reduce((sum, t) => sum + t.commission, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const totalVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
  
  const avgWinningPnl = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
    : 0;
    
  const avgLosingPnl = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
    : 0;
    
  const avgWinningTime = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.timeInTrade, 0) / winningTrades.length
    : 0;
    
  const avgLosingTime = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + t.timeInTrade, 0) / losingTrades.length
    : 0;
    
  const avgScratchTime = scratchTrades.length > 0
    ? scratchTrades.reduce((sum, t) => sum + t.timeInTrade, 0) / scratchTrades.length
    : 0;

  const streaks = calculateConsecutiveStreaks(trades);
  const stdDev = calculatePnlStandardDeviation(trades);
  const profitFactor = calculateProfitFactor(trades);

  return {
    stats: {
      totalGainLoss: totalPnl,
      largestGain: Math.max(...trades.map(t => t.pnl), 0),
      largestLoss: Math.min(...trades.map(t => t.pnl), 0),
      avgDailyGainLoss: totalPnl / 30, // Assuming 30 trading days
      avgDailyVolume: totalVolume / 30,
      avgPerShareGainLoss: totalPnl / totalVolume,
      avgTradeGainLoss: totalPnl / trades.length,
      avgWinningTrade: avgWinningPnl,
      avgLosingTrade: avgLosingPnl,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgHoldTimeScratch: formatDuration(avgScratchTime),
      avgHoldTimeWinning: formatDuration(avgWinningTime),
      avgHoldTimeLosing: formatDuration(avgLosingTime),
      scratchTrades: scratchTrades.length,
      maxConsecutiveWins: streaks.maxConsecutiveWins,
      maxConsecutiveLosses: streaks.maxConsecutiveLosses,
      tradePnlStdDev: stdDev,
      profitFactor: profitFactor,
      totalCommissions: totalCommissions,
      totalFees: totalFees
    },
    trades,
    loading: false,
    error: null
  };
}
*/

/* 
 * Database Engineer Review Point:
 * Optimized Prisma queries for production:
 * 
 * // Single aggregation query for all metrics
 * const stats = await prisma.trade.aggregate({
 *   where: { userId, status: 'CLOSED', ...filters },
 *   _sum: { pnl: true, commission: true, fees: true, quantity: true },
 *   _avg: { pnl: true, timeInTrade: true },
 *   _count: true,
 *   _max: { pnl: true },
 *   _min: { pnl: true }
 * });
 * 
 * // Separate query for winning/losing trade stats
 * const tradesByResult = await prisma.trade.groupBy({
 *   by: ['pnl'],
 *   where: { userId, status: 'CLOSED', ...filters },
 *   _count: true,
 *   _avg: { timeInTrade: true },
 *   having: {
 *     pnl: { not: 0 }
 *   }
 * });
 */