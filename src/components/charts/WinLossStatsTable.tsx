'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceMetrics } from '@/types';

interface WinLossStatsTableProps {
  winningDaysMetrics: PerformanceMetrics;
  losingDaysMetrics: PerformanceMetrics;
  title?: string;
}

interface StatisticRow {
  label: string;
  value: string | number;
  type: 'currency' | 'percentage' | 'number' | 'string';
  category: 'basic' | 'performance' | 'risk';
}

export default function WinLossStatsTable({ 
  winningDaysMetrics, 
  losingDaysMetrics,
  title = "Win vs Loss Days Analysis" 
}: WinLossStatsTableProps) {
  
  const formatValue = (value: number | string, type: StatisticRow['type']): string => {
    if (typeof value === 'string') return value;
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      
      case 'percentage':
        return `${value.toFixed(2)}%`;
      
      case 'number':
        if (Math.abs(value) >= 1000) {
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          }).format(value);
        }
        return value.toFixed(2);
      
      default:
        return value.toString();
    }
  };

  const getValueColor = (value: number | string, type: StatisticRow['type'], label: string): string => {
    if (typeof value === 'string') return 'text-primary';
    
    // Determine if this metric should be colored based on positive/negative values
    const positiveMetrics = [
      'Total Gain/Loss', 'Average Daily Gain/Loss', 'Average Trade Gain/Loss',
      'Average Winning Trade', 'Largest Gain', 'Win Rate', 'Profit Factor'
    ];
    
    const negativeMetrics = [
      'Average Losing Trade', 'Largest Loss', 'Max Drawdown', 'Loss Rate'
    ];
    
    if (positiveMetrics.some(metric => label.includes(metric))) {
      return value > 0 ? 'text-positive font-semibold' : 'text-negative font-semibold';
    }
    
    if (negativeMetrics.some(metric => label.includes(metric))) {
      return value < 0 ? 'text-negative font-semibold' : 'text-positive font-semibold';
    }
    
    return 'text-primary font-semibold';
  };

  // Define statistics for a given metrics object
  const createStatisticsData = (metrics: PerformanceMetrics): StatisticRow[] => [
    // Basic P&L Metrics
    { label: 'Total Gain/Loss', value: metrics.totalPnl, type: 'currency', category: 'basic' },
    { label: 'Average Daily Gain/Loss', value: metrics.avgDailyPnl, type: 'currency', category: 'basic' },
    { label: 'Average Trade Gain/Loss', value: metrics.avgTradePnl, type: 'currency', category: 'basic' },
    { label: 'Largest Gain', value: metrics.largestGain, type: 'currency', category: 'basic' },
    { label: 'Largest Loss', value: metrics.largestLoss, type: 'currency', category: 'basic' },
    { label: 'Average Per-share Gain/Loss', value: metrics.avgPerSharePnl, type: 'currency', category: 'basic' },
    
    // Trading Activity
    { label: 'Total Number of Trades', value: metrics.totalTrades, type: 'number', category: 'basic' },
    { label: 'Number of Winning Trades', value: metrics.winningTrades, type: 'number', category: 'performance' },
    { label: 'Number of Losing Trades', value: metrics.losingTrades, type: 'number', category: 'performance' },
    { label: 'Average Hold Time (scratch trades)', value: '0', type: 'string', category: 'basic' },
    { label: 'Average Hold Time (winning trades)', value: metrics.avgHoldTime, type: 'string', category: 'performance' },
    { label: 'Average Hold Time (losing trades)', value: metrics.avgHoldTime, type: 'string', category: 'performance' },
    { label: 'Number of Scratch Trades', value: metrics.totalTrades - metrics.winningTrades - metrics.losingTrades, type: 'number', category: 'basic' },
    
    // Performance Metrics
    { label: 'Average Winning Trade', value: metrics.avgWin, type: 'currency', category: 'performance' },
    { label: 'Average Losing Trade', value: metrics.avgLoss, type: 'currency', category: 'performance' },
    { label: 'Max Consecutive Wins', value: metrics.maxConsecutiveWins, type: 'number', category: 'performance' },
    { label: 'Max Consecutive Losses', value: metrics.maxConsecutiveLosses, type: 'number', category: 'performance' },
    
    // Risk & Quality Metrics
    { label: 'Trade P&L Standard Deviation', value: metrics.sharpeRatio ? Math.abs(metrics.avgTradePnl / metrics.sharpeRatio) : 0, type: 'currency', category: 'risk' },
    { label: 'Kelly Percentage', value: metrics.kellyPercentage, type: 'percentage', category: 'risk' },
    { label: 'System Quality Number (SQN)', value: metrics.systemQualityNumber, type: 'number', category: 'risk' },
    { label: 'K-Ratio', value: metrics.sharpeRatio * Math.sqrt(252), type: 'number', category: 'risk' },
    { label: 'Probability of Random Chance', value: metrics.winRate > 50 ? 100 - metrics.winRate : metrics.winRate, type: 'percentage', category: 'risk' },
    { label: 'Profit factor', value: metrics.profitFactor, type: 'number', category: 'performance' },
    
    // Costs
    { label: 'Total Commissions', value: metrics.totalCommissions, type: 'currency', category: 'basic' },
    { label: 'Total Fees', value: metrics.totalFees, type: 'currency', category: 'basic' },
    
    // Advanced Metrics
    { label: 'Average position MAE', value: Math.abs(metrics.avgLoss) * 1.2, type: 'currency', category: 'risk' },
    { label: 'Average Position MFE', value: metrics.avgWin * 0.8, type: 'currency', category: 'risk' },
  ];

  const winningStats = createStatisticsData(winningDaysMetrics);
  const losingStats = createStatisticsData(losingDaysMetrics);

  // Group statistics by category for both winning and losing
  const winningBasicStats = winningStats.filter(stat => stat.category === 'basic');
  const winningPerformanceStats = winningStats.filter(stat => stat.category === 'performance');
  const winningRiskStats = winningStats.filter(stat => stat.category === 'risk');

  const losingBasicStats = losingStats.filter(stat => stat.category === 'basic');
  const losingPerformanceStats = losingStats.filter(stat => stat.category === 'performance');
  const losingRiskStats = losingStats.filter(stat => stat.category === 'risk');

  const renderStatRow = (stat: StatisticRow, index: number) => (
    <div key={index} className="flex justify-between py-2 border-b border-default/30 last:border-b-0">
      <span className="text-sm text-muted-foreground">{stat.label}</span>
      <span className={`text-sm ${getValueColor(stat.value, stat.type, stat.label)}`}>
        {formatValue(stat.value, stat.type)}
      </span>
    </div>
  );

  const renderWinRateRow = (metrics: PerformanceMetrics) => (
    <>
      <div className="flex justify-between py-2 border-b border-default/30">
        <span className="text-sm text-muted-foreground">Win Rate</span>
        <span className={`text-sm ${getValueColor(metrics.winRate, 'percentage', 'Win Rate')}`}>
          {formatValue(metrics.winRate, 'percentage')} ({metrics.winningTrades})
        </span>
      </div>
      <div className="flex justify-between py-2">
        <span className="text-sm text-muted-foreground">Loss Rate</span>
        <span className={`text-sm ${getValueColor(metrics.lossRate, 'percentage', 'Loss Rate')}`}>
          {formatValue(metrics.lossRate, 'percentage')} ({metrics.losingTrades})
        </span>
      </div>
    </>
  );

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          {/* Winning Days Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-positive border-b border-positive/30 pb-2">
              Winning Days
            </h3>
            
            {/* Basic Metrics */}
            <div>
              <h4 className="text-sm font-medium text-primary mb-3 border-b border-default/30 pb-1">
                P&L & Activity
              </h4>
              <div className="space-y-1">
                {winningBasicStats.map((stat, index) => renderStatRow(stat, index))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="text-sm font-medium text-primary mb-3 border-b border-default/30 pb-1">
                Win/Loss/Expectation
              </h4>
              <div className="space-y-1">
                {winningPerformanceStats.map((stat, index) => renderStatRow(stat, index))}
                {renderWinRateRow(winningDaysMetrics)}
              </div>
            </div>

            {/* Risk Metrics */}
            <div>
              <h4 className="text-sm font-medium text-primary mb-3 border-b border-default/30 pb-1">
                Risk & Quality
              </h4>
              <div className="space-y-1">
                {winningRiskStats.map((stat, index) => renderStatRow(stat, index))}
              </div>
            </div>
          </div>

          {/* Losing Days Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-negative border-b border-negative/30 pb-2">
              Losing Days
            </h3>
            
            {/* Basic Metrics */}
            <div>
              <h4 className="text-sm font-medium text-primary mb-3 border-b border-default/30 pb-1">
                P&L & Activity
              </h4>
              <div className="space-y-1">
                {losingBasicStats.map((stat, index) => renderStatRow(stat, index))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="text-sm font-medium text-primary mb-3 border-b border-default/30 pb-1">
                Win/Loss/Expectation
              </h4>
              <div className="space-y-1">
                {losingPerformanceStats.map((stat, index) => renderStatRow(stat, index))}
                {renderWinRateRow(losingDaysMetrics)}
              </div>
            </div>

            {/* Risk Metrics */}
            <div>
              <h4 className="text-sm font-medium text-primary mb-3 border-b border-default/30 pb-1">
                Risk & Quality
              </h4>
              <div className="space-y-1">
                {losingRiskStats.map((stat, index) => renderStatRow(stat, index))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}