'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface TradingStatistic {
  label: string;
  value: string | number;
  formatter: 'currency' | 'number' | 'percentage' | 'time';
  colorCode?: 'positive' | 'negative' | 'neutral';
}

interface StatsSectionProps {
  stats?: {
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
}

export default function StatsSection({ stats }: StatsSectionProps) {
  // Mock data for initial implementation
  const mockStats = {
    totalGainLoss: 5234.50,
    largestGain: 1250.00,
    largestLoss: -450.75,
    avgDailyGainLoss: 125.50,
    avgDailyVolume: 15000,
    avgPerShareGainLoss: 0.85,
    avgTradeGainLoss: 45.25,
    avgWinningTrade: 125.00,
    avgLosingTrade: -75.50,
    totalTrades: 145,
    winningTrades: 85,
    losingTrades: 55,
    avgHoldTimeScratch: '5m 30s',
    avgHoldTimeWinning: '12m 45s',
    avgHoldTimeLosing: '8m 15s',
    scratchTrades: 5,
    maxConsecutiveWins: 8,
    maxConsecutiveLosses: 4,
    tradePnlStdDev: 125.50,
    profitFactor: 1.45,
    totalCommissions: 245.00,
    totalFees: 125.00
  };

  const currentStats = stats || mockStats;

  const formatValue = (value: unknown, formatter: TradingStatistic['formatter']): string => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (formatter) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(typeof value === 'number' ? value : 0);
      
      case 'percentage':
        return `${(typeof value === 'number' ? value : 0).toFixed(2)}%`;
      
      case 'number':
        if (typeof value === 'number') {
          return value % 1 === 0 
            ? value.toString() 
            : value.toFixed(2);
        }
        return value.toString();
      
      case 'time':
        return value.toString();
      
      default:
        return value.toString();
    }
  };

  const getColorClass = (value: unknown, colorCode?: TradingStatistic['colorCode']): string => {
    if (!colorCode || value === null || value === undefined) return 'text-primary';
    
    if (colorCode === 'positive') {
      return typeof value === 'number' && value >= 0 
        ? 'text-[#16A34A]' 
        : 'text-[#DC2626]';
    }
    
    if (colorCode === 'negative') {
      return typeof value === 'number' && value < 0 
        ? 'text-[#DC2626]' 
        : 'text-primary';
    }
    
    return 'text-primary';
  };

  const statistics: TradingStatistic[] = [
    // P&L Metrics
    { label: 'Total Gain/Loss', value: currentStats.totalGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Largest Gain', value: currentStats.largestGain, formatter: 'currency', colorCode: 'positive' },
    { label: 'Largest Loss', value: currentStats.largestLoss, formatter: 'currency', colorCode: 'negative' },
    
    // Average Metrics
    { label: 'Average Daily Gain/Loss', value: currentStats.avgDailyGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Daily Volume', value: currentStats.avgDailyVolume, formatter: 'number' },
    { label: 'Average Trade Gain/Loss', value: currentStats.avgTradeGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Per-share Gain/Loss', value: currentStats.avgPerShareGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Winning Trade', value: currentStats.avgWinningTrade, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Losing Trade', value: currentStats.avgLosingTrade, formatter: 'currency', colorCode: 'negative' },
    
    // Trade Counts
    { label: 'Total Number of Trades', value: currentStats.totalTrades, formatter: 'number' },
    { label: 'Number of Winning Trades', value: currentStats.winningTrades, formatter: 'number' },
    { label: 'Number of Losing Trades', value: currentStats.losingTrades, formatter: 'number' },
    
    // Hold Time Metrics
    { label: 'Average Hold Time (scratch trades)', value: currentStats.avgHoldTimeScratch, formatter: 'time' },
    { label: 'Average Hold Time (winning trades)', value: currentStats.avgHoldTimeWinning, formatter: 'time' },
    { label: 'Average Hold Time (losing trades)', value: currentStats.avgHoldTimeLosing, formatter: 'time' },
    
    // Additional Metrics
    { label: 'Number of Scratch Trades', value: currentStats.scratchTrades, formatter: 'number' },
    { label: 'Max Consecutive Wins', value: currentStats.maxConsecutiveWins, formatter: 'number' },
    { label: 'Max Consecutive Losses', value: currentStats.maxConsecutiveLosses, formatter: 'number' },
    
    // Volume & Cost Metrics
    { label: 'Total Volume', value: currentStats.totalVolume, formatter: 'number' },
    { label: 'Trade P&L Standard Deviation', value: currentStats.tradePnlStdDev, formatter: 'currency' },
    { label: 'Profit Factor', value: currentStats.profitFactor, formatter: 'number' },
    { label: 'Total Commissions', value: currentStats.totalCommissions, formatter: 'currency', colorCode: 'negative' },
    { label: 'Total Fees', value: currentStats.totalFees, formatter: 'currency', colorCode: 'negative' }
  ];

  /* 
   * Backend Engineer & Database Engineer Review Point:
   * Prisma queries for each metric (to be implemented in API route):
   * 
   * const totalGainLoss = await prisma.trade.aggregate({
   *   _sum: { pnl: true },
   *   where: { userId, status: 'CLOSED', ...filters }
   * });
   * 
   * const largestGain = await prisma.trade.findFirst({
   *   where: { userId, status: 'CLOSED', pnl: { gt: 0 }, ...filters },
   *   orderBy: { pnl: 'desc' },
   *   select: { pnl: true }
   * });
   * 
   * const avgMetrics = await prisma.trade.aggregate({
   *   _avg: { pnl: true, quantity: true, timeInTrade: true },
   *   where: { userId, status: 'CLOSED', ...filters }
   * });
   * 
   * const tradesByType = await prisma.trade.groupBy({
   *   by: ['status'],
   *   _count: true,
   *   where: { userId, ...filters }
   * });
   */

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-primary mb-4">Trading Statistics</h3>
      
      {/* Frontend Engineer Review Point: Responsive grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {statistics.map((stat, index) => (
          <Card key={index} className="bg-surface border-default hover:shadow-sm transition-shadow">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted truncate pr-2">
                  {stat.label}
                </span>
                <span className={`text-sm font-semibold ${getColorClass(stat.value, stat.colorCode)}`}>
                  {formatValue(stat.value, stat.formatter)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}