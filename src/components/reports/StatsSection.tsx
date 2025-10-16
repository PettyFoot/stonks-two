'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WinLossMetrics } from '@/types';

interface TradingStatistic {
  label: string;
  value: string | number;
  formatter: 'currency' | 'number' | 'percentage' | 'time' | 'volume';
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
  winLossStats?: WinLossMetrics;
}

export default function StatsSection({ stats, winLossStats }: StatsSectionProps) {
  // Return early if no stats are provided
  if (!stats) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-theme-primary-text mb-4">Trading Statistics</h3>
        <div className="text-theme-secondary-text">No trading statistics available.</div>
      </div>
    );
  }

  const currentStats = stats;

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
      
      case 'volume':
        if (typeof value === 'number') {
          return Math.round(value).toString();
        }
        return value.toString();
      
      case 'time':
        return value.toString();
      
      default:
        return value.toString();
    }
  };

  const getColorClass = (value: unknown, colorCode?: TradingStatistic['colorCode']): string => {
    if (!colorCode || value === null || value === undefined) return 'text-theme-primary-text';
    
    if (colorCode === 'positive' || colorCode === 'negative') {
      if (typeof value === 'number') {
        return value > 0 ? 'text-theme-green' : value < 0 ? 'text-theme-red' : 'text-theme-primary-text';
      }
    }
    
    return 'text-theme-primary-text';
  };

  const statistics: TradingStatistic[] = [
    // P&L Metrics
    { label: 'Total Gain/Loss', value: currentStats.totalGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Largest Gain', value: currentStats.largestGain, formatter: 'currency', colorCode: 'positive' },
    { label: 'Largest Loss', value: currentStats.largestLoss, formatter: 'currency', colorCode: 'positive' },
    
    // Average Metrics
    { label: 'Average Daily Gain/Loss', value: currentStats.avgDailyGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Daily Volume', value: currentStats.avgDailyVolume, formatter: 'volume' },
    { label: 'Average Trade Gain/Loss', value: currentStats.avgTradeGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Per-share Gain/Loss', value: currentStats.avgPerShareGainLoss, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Winning Trade', value: currentStats.avgWinningTrade, formatter: 'currency', colorCode: 'positive' },
    { label: 'Average Losing Trade', value: currentStats.avgLosingTrade, formatter: 'currency', colorCode: 'positive' },
    
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
    { label: 'Trade P&L Standard Deviation', value: currentStats.tradePnlStdDev, formatter: 'currency', colorCode: 'positive' },
    { label: 'Profit Factor', value: currentStats.profitFactor, formatter: 'number' },
    { label: 'Total Commissions', value: currentStats.totalCommissions, formatter: 'currency', colorCode: 'positive' },
    { label: 'Total Fees', value: currentStats.totalFees, formatter: 'currency', colorCode: 'positive' }
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
      <h3 className="text-lg font-semibold text-theme-primary-text mb-4">Trading Statistics</h3>

      {/* Three colored sections layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Blue Section - Overall Statistics (All Days) */}
        <div style={{ boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.05)' }}>
          <Card className="bg-theme-surface border-theme-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-theme-primary-text">
                Trading Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Gain/Loss</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.totalGainLoss, 'positive')}`}>
                    {formatValue(currentStats.totalGainLoss, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Largest Gain</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.largestGain, 'positive')}`}>
                    {formatValue(currentStats.largestGain, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Largest Loss</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.largestLoss, 'positive')}`}>
                    {formatValue(currentStats.largestLoss, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Daily Gain/Loss</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.avgDailyGainLoss, 'positive')}`}>
                    {formatValue(currentStats.avgDailyGainLoss, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Daily Volume</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(currentStats.avgDailyVolume, 'volume')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Per-share Gain/Loss</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.avgPerShareGainLoss, 'positive')}`}>
                    {formatValue(currentStats.avgPerShareGainLoss, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Win %</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {(() => {
                      const totalTrades = currentStats.winningTrades + currentStats.losingTrades;
                      if (totalTrades === 0) return '0.00%';
                      const winRate = (currentStats.winningTrades / totalTrades) * 100;
                      return `${winRate.toFixed(2)}%`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Number of Trades</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(currentStats.totalTrades, 'number')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Trades Per Day</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats ? formatValue((winLossStats.dayCount.total > 0 ? currentStats.totalTrades / winLossStats.dayCount.total : 0), 'number') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Winning Trade</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.avgWinningTrade, 'positive')}`}>
                    {formatValue(currentStats.avgWinningTrade, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Losing Trade</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.avgLosingTrade, 'positive')}`}>
                    {formatValue(currentStats.avgLosingTrade, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (winning trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(currentStats.avgHoldTimeWinning, 'time')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (losing trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(currentStats.avgHoldTimeLosing, 'time')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Profit Factor</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(currentStats.profitFactor, 'number')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Commissions</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.totalCommissions, 'positive')}`}>
                    {formatValue(currentStats.totalCommissions, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Fees</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.totalFees, 'positive')}`}>
                    {formatValue(currentStats.totalFees, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Trade P&L Standard Deviation</span>
                  <span className={`text-sm font-semibold ${getColorClass(currentStats.tradePnlStdDev, 'positive')}`}>
                    {formatValue(currentStats.tradePnlStdDev, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (scratch trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(currentStats.avgHoldTimeScratch, 'time')}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-theme-secondary-text">Number of Scratch Trades</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(currentStats.scratchTrades, 'number')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Green Section - Winning Days Statistics */}
        <div style={{ boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.3), 0 4px 6px -2px rgba(34, 197, 94, 0.05)' }}>
          <Card className="bg-theme-surface border-theme-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-green-700">
                Winning Days Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Gain/Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.totalPnl && winLossStats.winningDays.totalPnl !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.totalPnl || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Largest Gain</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.largestGain && winLossStats.winningDays.largestGain !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.largestGain || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Largest Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.largestLoss && winLossStats.winningDays.largestLoss !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.largestLoss || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Daily Gain/Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.avgDailyPnl && winLossStats.winningDays.avgDailyPnl !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.avgDailyPnl || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Daily Volume</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats?.winningDays.avgDailyVolume ? formatValue(winLossStats.winningDays.avgDailyVolume, 'volume') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Per-share Gain/Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.avgPerSharePnl && winLossStats.winningDays.avgPerSharePnl !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.avgPerSharePnl || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Win %</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {(() => {
                      if (!winLossStats?.winningDays) return '0.00%';
                      const totalTrades = (winLossStats.winningDays.winningTrades || 0) + (winLossStats.winningDays.losingTrades || 0);
                      if (totalTrades === 0) return '0.00%';
                      const winRate = ((winLossStats.winningDays.winningTrades || 0) / totalTrades) * 100;
                      return `${winRate.toFixed(2)}%`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Number of Trades</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats?.winningDays.totalTrades ? formatValue(winLossStats.winningDays.totalTrades, 'number') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Trades Per Day</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats && winLossStats.dayCount.winning > 0 ? formatValue((winLossStats.winningDays.totalTrades || 0) / winLossStats.dayCount.winning, 'number') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Winning Trade</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.avgWin && winLossStats.winningDays.avgWin !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.avgWin || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Losing Trade</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.avgLoss && winLossStats.winningDays.avgLoss !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.avgLoss || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (winning trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats?.winningDays.avgHoldTime ? formatValue(winLossStats.winningDays.avgHoldTime, 'time') : '0s'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (losing trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats?.winningDays.avgHoldTime ? formatValue(winLossStats.winningDays.avgHoldTime, 'time') : '0s'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Profit Factor</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats?.winningDays.profitFactor ? formatValue(winLossStats.winningDays.profitFactor, 'number') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Commissions</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.totalCommissions && winLossStats.winningDays.totalCommissions !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.totalCommissions || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Fees</span>
                  <span className={`text-sm font-semibold ${winLossStats?.winningDays.totalFees && winLossStats.winningDays.totalFees !== 0 ? 'text-green-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.winningDays.totalFees || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Trade P&L Standard Deviation</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    $0.00
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (scratch trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    0s
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-theme-secondary-text">Number of Scratch Trades</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    0
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Red Section - Losing Days Statistics */}
        <div style={{ boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.05)' }}>
          <Card className="bg-theme-surface border-theme-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-red-700">
                Losing Days Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Gain/Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.totalPnl && winLossStats.losingDays.totalPnl !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.totalPnl || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Largest Gain</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.largestGain && winLossStats.losingDays.largestGain !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.largestGain || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Largest Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.largestLoss && winLossStats.losingDays.largestLoss !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.largestLoss || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Daily Gain/Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.avgDailyPnl && winLossStats.losingDays.avgDailyPnl !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.avgDailyPnl || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Daily Volume</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(winLossStats?.losingDays.avgDailyVolume || 0, 'volume')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Per-share Gain/Loss</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.avgPerSharePnl && winLossStats.losingDays.avgPerSharePnl !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.avgPerSharePnl || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Win %</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {(() => {
                      if (!winLossStats?.losingDays) return '0.00%';
                      const totalTrades = (winLossStats.losingDays.winningTrades || 0) + (winLossStats.losingDays.losingTrades || 0);
                      if (totalTrades === 0) return '0.00%';
                      const winRate = ((winLossStats.losingDays.winningTrades || 0) / totalTrades) * 100;
                      return `${winRate.toFixed(2)}%`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Number of Trades</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(winLossStats?.losingDays.totalTrades || 0, 'number')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Trades Per Day</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {winLossStats && winLossStats.dayCount.losing > 0 ? formatValue((winLossStats.losingDays.totalTrades || 0) / winLossStats.dayCount.losing, 'number') : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Winning Trade</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.avgWin && winLossStats.losingDays.avgWin !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.avgWin || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Losing Trade</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.avgLoss && winLossStats.losingDays.avgLoss !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.avgLoss || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (winning trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(winLossStats?.losingDays.avgHoldTime || '0s', 'time')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (losing trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(winLossStats?.losingDays.avgHoldTime || '0s', 'time')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Profit Factor</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    {formatValue(winLossStats?.losingDays.profitFactor || 0, 'number')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Commissions</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.totalCommissions && winLossStats.losingDays.totalCommissions !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.totalCommissions || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Total Fees</span>
                  <span className={`text-sm font-semibold ${winLossStats?.losingDays.totalFees && winLossStats.losingDays.totalFees !== 0 ? 'text-red-600' : 'text-theme-primary-text'}`}>
                    {formatValue(winLossStats?.losingDays.totalFees || 0, 'currency')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Trade P&L Standard Deviation</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    $0.00
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-theme-border/30">
                  <span className="text-sm text-theme-secondary-text">Average Hold Time (scratch trades)</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    0s
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-theme-secondary-text">Number of Scratch Trades</span>
                  <span className="text-sm font-semibold text-theme-primary-text">
                    0
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}