'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trade } from '@/types';

interface DayMetrics {
  totalGainLoss: number;
  avgDailyGainLoss: number;
  avgDailyVolume: number;
  avgPerShareGainLoss: number;
  avgTradeGainLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  tradeStdDev: number;
  avgHoldWinning: number;
  avgHoldLosing: number;
  profitFactor: number;
  largestGain: number;
  largestLoss: number;
  totalCommissions: number;
  totalFees: number;
}

interface WinLossDaysData {
  winningDays: DayMetrics;
  losingDays: DayMetrics;
  winningDaysCount: number;
  losingDaysCount: number;
}


interface WinVsLossReportProps {
  trades: Trade[];
  loading: boolean;
  error: string | null;
}

export default function WinVsLossReport({ trades, loading, error }: WinVsLossReportProps) {
  // Calculate metrics for a set of trades
  const calculateMetrics = (trades: Trade[]): DayMetrics => {
    if (trades.length === 0) {
      return {
        totalGainLoss: 0,
        avgDailyGainLoss: 0,
        avgDailyVolume: 0,
        avgPerShareGainLoss: 0,
        avgTradeGainLoss: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        avgWinningTrade: 0,
        avgLosingTrade: 0,
        tradeStdDev: 0,
        avgHoldWinning: 0,
        avgHoldLosing: 0,
        profitFactor: 0,
        largestGain: 0,
        largestLoss: 0,
        totalCommissions: 0,
        totalFees: 0,
      };
    }

    let totalPnl = 0;
    let totalVolume = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let largestGain = 0;
    let largestLoss = 0;
    let totalCommissions = 0;
    let totalFees = 0;
    let totalHoldWinning = 0;
    let totalHoldLosing = 0;
    let winningHoldCount = 0;
    let losingHoldCount = 0;
    const pnlValues: number[] = [];

    trades.forEach(trade => {
      const pnl = Number(trade.pnl) || 0;
      const quantity = Number(trade.quantity) || 0;
      const commission = Number(trade.commission) || 0;
      const fees = Number(trade.fees) || 0;
      
      totalPnl += pnl;
      totalVolume += quantity;
      totalCommissions += commission;
      totalFees += fees;
      pnlValues.push(pnl);

      // Calculate hold time
      let holdTime = 0;
      if (trade.timeInTrade) {
        holdTime = Number(trade.timeInTrade);
      } else if (trade.exitDate && trade.entryDate) {
        const exit = new Date(trade.exitDate);
        const entry = new Date(trade.entryDate);
        holdTime = (exit.getTime() - entry.getTime()) / 1000;
      }

      if (pnl > 0) {
        winningTrades++;
        totalWins += pnl;
        largestGain = Math.max(largestGain, pnl);
        totalHoldWinning += holdTime;
        winningHoldCount++;
      } else if (pnl < 0) {
        losingTrades++;
        totalLosses += Math.abs(pnl);
        largestLoss = Math.min(largestLoss, pnl);
        totalHoldLosing += holdTime;
        losingHoldCount++;
      }
    });

    // Calculate derived metrics
    const totalTrades = trades.length;
    const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
    const avgHoldWinning = winningHoldCount > 0 ? totalHoldWinning / winningHoldCount : 0;
    const avgHoldLosing = losingHoldCount > 0 ? totalHoldLosing / losingHoldCount : 0;
    // Calculate profit factor with better edge case handling
    let profitFactor: number;
    if (totalLosses > 0 && totalWins > 0) {
      // Normal case: both wins and losses exist
      profitFactor = totalWins / totalLosses;
    } else if (totalWins > 0 && totalLosses === 0) {
      // Only winning trades: use total P&L as profit factor
      profitFactor = totalPnl;
    } else if (totalLosses > 0 && totalWins === 0) {
      // Only losing trades: use negative total P&L as profit factor
      profitFactor = totalPnl; // This will be negative
    } else {
      // No trades or all zero P&L trades
      profitFactor = 0;
    }
    
    // Calculate standard deviation
    const avgPnl = totalPnl / totalTrades;
    const variance = pnlValues.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnl, 2), 0) / totalTrades;
    const stdDev = Math.sqrt(variance);

    // Count unique days
    const uniqueDates = new Set(trades.map(t => {
      const tradeDate = t.exitDate || t.date;
      if (!tradeDate) return new Date().toISOString().split('T')[0];
      try {
        return new Date(tradeDate as string | Date).toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    }));
    const uniqueDays = uniqueDates.size;

    return {
      totalGainLoss: totalPnl,
      avgDailyGainLoss: uniqueDays > 0 ? totalPnl / uniqueDays : 0,
      avgDailyVolume: uniqueDays > 0 ? totalVolume / uniqueDays : 0,
      avgPerShareGainLoss: totalVolume > 0 ? totalPnl / totalVolume : 0,
      avgTradeGainLoss: totalTrades > 0 ? totalPnl / totalTrades : 0,
      totalTrades: totalTrades,
      winningTrades: winningTrades,
      losingTrades: losingTrades,
      avgWinningTrade: avgWin,
      avgLosingTrade: losingTrades > 0 ? -avgLoss : 0,
      tradeStdDev: stdDev,
      avgHoldWinning: avgHoldWinning,
      avgHoldLosing: avgHoldLosing,
      profitFactor: profitFactor,
      largestGain: largestGain,
      largestLoss: largestLoss,
      totalCommissions: totalCommissions,
      totalFees: totalFees,
    };
  };

  // Calculate win/loss days metrics from trades
  const data = useMemo((): WinLossDaysData | null => {
    if (!trades || trades.length === 0) return null;

    console.log('\n=== WIN VS LOSS CLIENT-SIDE CALCULATION ===');
    console.log(`Processing ${trades.length} trades:`, trades);

    // Group trades by date to calculate daily P&L
    const dailyPnlMap = new Map<string, { daily_pnl: number; daily_volume: number; trades: Trade[] }>();
    
    trades.forEach(trade => {
      // Use exitDate if available, otherwise fall back to date
      const tradeDate = trade.exitDate || trade.date;
      if (!tradeDate) return;
      
      const dateKey = new Date(tradeDate as string | Date).toISOString().split('T')[0];
      
      const existing = dailyPnlMap.get(dateKey) || { daily_pnl: 0, daily_volume: 0, trades: [] };
      
      existing.daily_pnl += Number(trade.pnl) || 0;
      existing.daily_volume += Number(trade.quantity) || 0;
      existing.trades.push(trade);
      
      dailyPnlMap.set(dateKey, existing);
    });

    const dailyResults = Array.from(dailyPnlMap.entries()).map(([dateStr, data]) => ({
      date: dateStr,
      daily_pnl: data.daily_pnl,
      daily_volume: data.daily_volume,
      trades: data.trades
    }));

    console.log('Daily P&L Results:', dailyResults);

    // Separate winning and losing days
    const winningDays = dailyResults.filter(day => day.daily_pnl > 0);
    const losingDays = dailyResults.filter(day => day.daily_pnl <= 0);

    console.log(`Winning Days: ${winningDays.length}, Losing Days: ${losingDays.length}`);

    // Calculate metrics for winning days
    const winningDaysMetrics = calculateMetrics(winningDays.flatMap(day => day.trades));
    const losingDaysMetrics = calculateMetrics(losingDays.flatMap(day => day.trades));

    console.log('Winning Days Metrics:', winningDaysMetrics);
    console.log('Losing Days Metrics:', losingDaysMetrics);
    console.log('===========================================\n');

    return {
      winningDays: winningDaysMetrics,
      losingDays: losingDaysMetrics,
      winningDaysCount: winningDays.length,
      losingDaysCount: losingDays.length
    };
  }, [trades]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
    return `${(seconds / 86400).toFixed(1)}d`;
  };

  const renderStatRow = (
    label: string,
    winValue: number,
    lossValue: number,
    format: 'currency' | 'number' | 'time' | 'decimal' = 'number'
  ) => {
    let formattedWinValue: string;
    let formattedLossValue: string;
    
    switch (format) {
      case 'currency':
        formattedWinValue = formatCurrency(winValue);
        formattedLossValue = formatCurrency(lossValue);
        break;
      case 'time':
        formattedWinValue = formatTime(winValue);
        formattedLossValue = formatTime(lossValue);
        break;
      case 'decimal':
        formattedWinValue = formatNumber(winValue, 2);
        formattedLossValue = formatNumber(lossValue, 2);
        break;
      default:
        formattedWinValue = formatNumber(winValue);
        formattedLossValue = formatNumber(lossValue);
    }

    const getValueColor = (value: number, isWinColumn: boolean) => {
      // Zero values always use primary text color
      if (value === 0) {
        return 'text-theme-primary-text';
      }

      // Fields that can be green (positive) or red (negative)
      const greenRedFields = [
        'Total Gain / Loss',
        'Average Daily Gain / Loss',
        'Average Per-Share Gain / Loss',
        'Average Trade Gain / Loss',
        'Winning Trades',
        'Average Winning Trade',
        'Largest Gain'
      ];

      // Fields that are typically red when negative
      const redFields = [
        'Largest Loss',
        'Average Losing Trade',
        'Losing Trades'
      ];

      if (greenRedFields.includes(label)) {
        return value > 0 ? 'text-theme-green' : 'text-theme-red';
      }

      if (redFields.includes(label)) {
        return value < 0 ? 'text-theme-red' : 'text-theme-primary-text';
      }

      // All other fields use primary text color
      return 'text-theme-primary-text';
    };

    return (
      <div className="hidden md:grid grid-cols-2 gap-4 py-2 border-b border-border last:border-b-0">
        {/* Winning Days Column */}
        <div className="flex justify-between items-center gap-2 border-r border-border pr-4">
          <div className="text-sm text-theme-secondary-text">{label}</div>
          <div className={`text-sm font-medium ${getValueColor(winValue, true)}`}>
            {formattedWinValue}
          </div>
        </div>
        {/* Losing Days Column */}
        <div className="flex justify-between items-center gap-2 pl-4">
          <div className="text-sm text-theme-secondary-text">{label}</div>
          <div className={`text-sm font-medium ${getValueColor(lossValue, false)}`}>
            {formattedLossValue}
          </div>
        </div>
      </div>
    );
  };

  const renderMobileStatRow = (
    label: string,
    value: number,
    format: 'currency' | 'number' | 'time' | 'decimal' = 'number'
  ) => {
    let formattedValue: string;
    
    switch (format) {
      case 'currency':
        formattedValue = formatCurrency(value);
        break;
      case 'time':
        formattedValue = formatTime(value);
        break;
      case 'decimal':
        formattedValue = formatNumber(value, 2);
        break;
      default:
        formattedValue = formatNumber(value);
    }

    const getValueColor = (value: number) => {
      // Zero values always use primary text color
      if (value === 0) {
        return 'text-theme-primary-text';
      }

      // Fields that can be green (positive) or red (negative)
      const greenRedFields = [
        'Total Gain / Loss',
        'Average Daily Gain / Loss',
        'Average Per-Share Gain / Loss',
        'Average Trade Gain / Loss',
        'Winning Trades',
        'Average Winning Trade',
        'Largest Gain'
      ];

      // Fields that are typically red when negative
      const redFields = [
        'Largest Loss',
        'Average Losing Trade',
        'Losing Trades'
      ];

      if (greenRedFields.includes(label)) {
        return value > 0 ? 'text-theme-green' : 'text-theme-red';
      }

      if (redFields.includes(label)) {
        return value < 0 ? 'text-theme-red' : 'text-theme-primary-text';
      }

      // All other fields use primary text color
      return 'text-theme-primary-text';
    };

    return (
      <div className="flex justify-between items-center gap-2 py-2 border-b border-border last:border-b-0">
        <div className="text-sm text-theme-secondary-text">{label}</div>
        <div className={`text-sm font-medium ${getValueColor(value)}`}>
          {formattedValue}
        </div>
      </div>
    );
  };

  const renderSkeletonRow = () => (
    <div className="hidden md:grid grid-cols-2 gap-4 py-2 border-b border-border">
      <div className="flex justify-between items-center gap-2 border-r border-border pr-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between items-center gap-2 pl-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );

  const renderMobileSkeletonRow = () => (
    <div className="flex justify-between items-center gap-2 py-2 border-b border-border">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-20" />
    </div>
  );

  if (error) {
    return (
      <Card className="bg-theme-surface border-theme-border">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-theme-red">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-theme-surface border-theme-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-theme-primary-text">Win vs Loss Days Analysis</CardTitle>
        {/* Desktop header - side by side */}
        <div className="hidden md:grid grid-cols-2 gap-4 mt-4 pb-2 border-b border-border">
          <div className="text-center">
            <span 
              className="font-semibold text-lg text-theme-primary-text"
              aria-label="Winning Days Column"
            >
              Winning Days {data ? `(${data.winningDaysCount})` : ''}
            </span>
          </div>
          <div className="text-center">
            <span 
              className="font-semibold text-lg text-theme-primary-text"
              aria-label="Losing Days Column"
            >
              Losing Days {data ? `(${data.losingDaysCount})` : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Desktop Layout */}
        <div className="hidden md:block space-y-0">
          {/* P&L Metrics Section */}
          <div className="pt-3 pb-2">
            <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
              P&L Metrics
            </div>
          </div>
          
          {loading ? (
            <>
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
            </>
          ) : data ? (
            <>
              {renderStatRow('Total Gain / Loss', data.winningDays.totalGainLoss, data.losingDays.totalGainLoss, 'currency')}
              {renderStatRow('Average Daily Gain / Loss', data.winningDays.avgDailyGainLoss, data.losingDays.avgDailyGainLoss, 'currency')}
              {renderStatRow('Average Daily Volume', data.winningDays.avgDailyVolume, data.losingDays.avgDailyVolume, 'number')}
              {renderStatRow('Average Per-Share Gain / Loss', data.winningDays.avgPerShareGainLoss, data.losingDays.avgPerShareGainLoss, 'currency')}
              {renderStatRow('Average Trade Gain / Loss', data.winningDays.avgTradeGainLoss, data.losingDays.avgTradeGainLoss, 'currency')}
            </>
          ) : null}
          
          {/* Trading Activity Section */}
          <div className="pt-4 pb-2">
            <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
              Trading Activity
            </div>
          </div>
          
          {loading ? (
            <>
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
            </>
          ) : data ? (
            <>
              {renderStatRow('Total Number of Trades', data.winningDays.totalTrades, data.losingDays.totalTrades, 'number')}
              {renderStatRow('Winning Trades', data.winningDays.winningTrades, data.losingDays.winningTrades, 'number')}
              {renderStatRow('Losing Trades', data.winningDays.losingTrades, data.losingDays.losingTrades, 'number')}
            </>
          ) : null}
          
          {/* Performance Metrics Section */}
          <div className="pt-4 pb-2">
            <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
              Performance Metrics
            </div>
          </div>
          
          {loading ? (
            <>
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
            </>
          ) : data ? (
            <>
              {renderStatRow('Average Winning Trade', data.winningDays.avgWinningTrade, data.losingDays.avgWinningTrade, 'currency')}
              {renderStatRow('Average Losing Trade', data.winningDays.avgLosingTrade, data.losingDays.avgLosingTrade, 'currency')}
              {renderStatRow('Trade P&L Standard Deviation', data.winningDays.tradeStdDev, data.losingDays.tradeStdDev, 'currency')}
              {renderStatRow('Average Hold Time (Winning Trades)', data.winningDays.avgHoldWinning, data.losingDays.avgHoldWinning, 'time')}
              {renderStatRow('Average Hold Time (Losing Trades)', data.winningDays.avgHoldLosing, data.losingDays.avgHoldLosing, 'time')}
              {renderStatRow('Profit Factor', data.winningDays.profitFactor, data.losingDays.profitFactor, 'decimal')}
              {renderStatRow('Largest Gain', data.winningDays.largestGain, data.losingDays.largestGain, 'currency')}
              {renderStatRow('Largest Loss', data.winningDays.largestLoss, data.losingDays.largestLoss, 'currency')}
            </>
          ) : null}
          
          {/* Costs Section */}
          <div className="pt-4 pb-2">
            <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
              Costs
            </div>
          </div>
          
          {loading ? (
            <>
              {renderSkeletonRow()}
              {renderSkeletonRow()}
            </>
          ) : data ? (
            <>
              {renderStatRow('Total Commissions', data.winningDays.totalCommissions, data.losingDays.totalCommissions, 'currency')}
              {renderStatRow('Total Fees', data.winningDays.totalFees, data.losingDays.totalFees, 'currency')}
            </>
          ) : null}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-6">
          {/* Winning Days Section */}
          <div>
            <div className="text-center mb-4">
              <span className="font-semibold text-lg text-theme-primary-text">
                Winning Days {data ? `(${data.winningDaysCount})` : ''}
              </span>
            </div>
            
            {/* P&L Metrics - Winning Days */}
            <div className="pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                P&L Metrics
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Total Gain / Loss', data.winningDays.totalGainLoss, 'currency')}
                {renderMobileStatRow('Average Daily Gain / Loss', data.winningDays.avgDailyGainLoss, 'currency')}
                {renderMobileStatRow('Average Daily Volume', data.winningDays.avgDailyVolume, 'number')}
                {renderMobileStatRow('Average Per-Share Gain / Loss', data.winningDays.avgPerShareGainLoss, 'currency')}
                {renderMobileStatRow('Average Trade Gain / Loss', data.winningDays.avgTradeGainLoss, 'currency')}
              </>
            ) : null}
            
            {/* Trading Activity - Winning Days */}
            <div className="pt-4 pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                Trading Activity
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Total Number of Trades', data.winningDays.totalTrades, 'number')}
                {renderMobileStatRow('Winning Trades', data.winningDays.winningTrades, 'number')}
                {renderMobileStatRow('Losing Trades', data.winningDays.losingTrades, 'number')}
              </>
            ) : null}
            
            {/* Performance Metrics - Winning Days */}
            <div className="pt-4 pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                Performance Metrics
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Average Winning Trade', data.winningDays.avgWinningTrade, 'currency')}
                {renderMobileStatRow('Average Losing Trade', data.winningDays.avgLosingTrade, 'currency')}
                {renderMobileStatRow('Trade P&L Standard Deviation', data.winningDays.tradeStdDev, 'currency')}
                {renderMobileStatRow('Average Hold Time (Winning Trades)', data.winningDays.avgHoldWinning, 'time')}
                {renderMobileStatRow('Average Hold Time (Losing Trades)', data.winningDays.avgHoldLosing, 'time')}
                {renderMobileStatRow('Profit Factor', data.winningDays.profitFactor, 'decimal')}
                {renderMobileStatRow('Largest Gain', data.winningDays.largestGain, 'currency')}
                {renderMobileStatRow('Largest Loss', data.winningDays.largestLoss, 'currency')}
              </>
            ) : null}
            
            {/* Costs - Winning Days */}
            <div className="pt-4 pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                Costs
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Total Commissions', data.winningDays.totalCommissions, 'currency')}
                {renderMobileStatRow('Total Fees', data.winningDays.totalFees, 'currency')}
              </>
            ) : null}
          </div>

          {/* Losing Days Section */}
          <div>
            <div className="text-center mb-4">
              <span className="font-semibold text-lg text-theme-primary-text">
                Losing Days {data ? `(${data.losingDaysCount})` : ''}
              </span>
            </div>
            
            {/* P&L Metrics - Losing Days */}
            <div className="pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                P&L Metrics
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Total Gain / Loss', data.losingDays.totalGainLoss, 'currency')}
                {renderMobileStatRow('Average Daily Gain / Loss', data.losingDays.avgDailyGainLoss, 'currency')}
                {renderMobileStatRow('Average Daily Volume', data.losingDays.avgDailyVolume, 'number')}
                {renderMobileStatRow('Average Per-Share Gain / Loss', data.losingDays.avgPerShareGainLoss, 'currency')}
                {renderMobileStatRow('Average Trade Gain / Loss', data.losingDays.avgTradeGainLoss, 'currency')}
              </>
            ) : null}
            
            {/* Trading Activity - Losing Days */}
            <div className="pt-4 pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                Trading Activity
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Total Number of Trades', data.losingDays.totalTrades, 'number')}
                {renderMobileStatRow('Winning Trades', data.losingDays.winningTrades, 'number')}
                {renderMobileStatRow('Losing Trades', data.losingDays.losingTrades, 'number')}
              </>
            ) : null}
            
            {/* Performance Metrics - Losing Days */}
            <div className="pt-4 pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                Performance Metrics
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Average Winning Trade', data.losingDays.avgWinningTrade, 'currency')}
                {renderMobileStatRow('Average Losing Trade', data.losingDays.avgLosingTrade, 'currency')}
                {renderMobileStatRow('Trade P&L Standard Deviation', data.losingDays.tradeStdDev, 'currency')}
                {renderMobileStatRow('Average Hold Time (Winning Trades)', data.losingDays.avgHoldWinning, 'time')}
                {renderMobileStatRow('Average Hold Time (Losing Trades)', data.losingDays.avgHoldLosing, 'time')}
                {renderMobileStatRow('Profit Factor', data.losingDays.profitFactor, 'decimal')}
                {renderMobileStatRow('Largest Gain', data.losingDays.largestGain, 'currency')}
                {renderMobileStatRow('Largest Loss', data.losingDays.largestLoss, 'currency')}
              </>
            ) : null}
            
            {/* Costs - Losing Days */}
            <div className="pt-4 pb-2">
              <div className="text-xs font-semibold text-theme-secondary-text uppercase tracking-wider">
                Costs
              </div>
            </div>
            
            {loading ? (
              <>
                {renderMobileSkeletonRow()}
                {renderMobileSkeletonRow()}
              </>
            ) : data ? (
              <>
                {renderMobileStatRow('Total Commissions', data.losingDays.totalCommissions, 'currency')}
                {renderMobileStatRow('Total Fees', data.losingDays.totalFees, 'currency')}
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}