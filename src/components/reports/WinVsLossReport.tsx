'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';

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
}

export default function WinVsLossReport() {
  const [data, setData] = useState<WinLossDaysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { filters } = useGlobalFilters();
  const { symbol, side, customDateRange } = filters;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        if (customDateRange?.from) params.append('from', customDateRange.from);
        if (customDateRange?.to) params.append('to', customDateRange.to);
        if (symbol && symbol !== 'all') params.append('symbol', symbol);
        if (side && side !== 'all') params.append('side', side);

        const response = await fetch(`/api/reports/win-loss-days?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch win/loss statistics');
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching win/loss stats:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch win/loss statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customDateRange, symbol, side]);

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
      if (label.includes('Loss') || label.includes('Losing')) {
        return value < 0 ? 'text-theme-red' : 'text-theme-secondary-text';
      }
      if (label.includes('Gain') || label.includes('Winning')) {
        return value > 0 ? 'text-theme-green' : 'text-theme-secondary-text';
      }
      if (label === 'Total Gain / Loss' || label === 'Average Daily Gain / Loss') {
        return isWinColumn 
          ? (value > 0 ? 'text-theme-green' : 'text-theme-secondary-text')
          : (value < 0 ? 'text-theme-red' : 'text-theme-secondary-text');
      }
      return 'text-foreground';
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 border-b border-border last:border-b-0">
        {/* Winning Days Column */}
        <div className="flex justify-between items-center gap-2 md:border-r md:border-border md:pr-4">
          <div className="text-sm text-theme-secondary-text">{label}</div>
          <div className={`text-sm font-medium ${getValueColor(winValue, true)}`}>
            {formattedWinValue}
          </div>
        </div>
        {/* Losing Days Column */}
        <div className="flex justify-between items-center gap-2 md:pl-4">
          <div className="text-sm text-theme-secondary-text">{label}</div>
          <div className={`text-sm font-medium ${getValueColor(lossValue, false)}`}>
            {formattedLossValue}
          </div>
        </div>
      </div>
    );
  };

  const renderSkeletonRow = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 border-b border-border">
      <div className="flex justify-between items-center gap-2 md:border-r md:border-border md:pr-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between items-center gap-2 md:pl-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pb-2 border-b border-border">
          <div className="text-center">
            <span 
              className="font-semibold text-lg text-theme-primary-text"
              aria-label="Winning Days Column"
            >
              Winning Days
            </span>
          </div>
          <div className="text-center">
            <span 
              className="font-semibold text-lg text-theme-primary-text"
              aria-label="Losing Days Column"
            >
              Losing Days
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
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
      </CardContent>
    </Card>
  );
}