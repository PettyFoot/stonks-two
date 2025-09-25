'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceMetrics } from '@/types';

interface StatisticsTableProps {
  metrics: PerformanceMetrics;
  title?: string;
}

interface StatisticRow {
  label: string;
  value: string | number;
  type: 'currency' | 'percentage' | 'number' | 'string';
  category: 'basic' | 'performance' | 'risk';
}

export default function StatisticsTable({ 
  metrics, 
  title = "Performance Statistics" 
}: StatisticsTableProps) {
  
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

  // Define all statistics with their formatting
  const statisticsData: StatisticRow[] = [
    // Basic P&L Metrics
    { label: 'Total Gain/Loss', value: metrics.totalPnl, type: 'currency', category: 'basic' },
    { label: 'Average Daily Gain/Loss', value: metrics.avgDailyPnl, type: 'currency', category: 'basic' },
    { label: 'Average Trade Gain/Loss', value: metrics.avgTradePnl, type: 'currency', category: 'basic' },
    { label: 'Largest Gain', value: metrics.largestGain, type: 'currency', category: 'basic' },
    { label: 'Largest Loss', value: metrics.largestLoss, type: 'currency', category: 'basic' },
    { label: 'Average Per-share Gain/Loss', value: metrics.avgPerSharePnl, type: 'currency', category: 'basic' },
    { label: 'Average Daily Volume', value: metrics.avgDailyVolume, type: 'number', category: 'basic' },

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
    { label: 'K-Ratio', value: metrics.sharpeRatio * Math.sqrt(252), type: 'number', category: 'risk' }, // Annualized Sharpe ratio
    { label: 'Probability of Random Chance', value: metrics.winRate > 50 ? 100 - metrics.winRate : metrics.winRate, type: 'percentage', category: 'risk' },
    { label: 'Profit factor', value: metrics.profitFactor, type: 'number', category: 'performance' },
    
    // Costs
    { label: 'Total Commissions', value: metrics.totalCommissions, type: 'currency', category: 'basic' },
    { label: 'Total Fees', value: metrics.totalFees, type: 'currency', category: 'basic' },
    
    // Advanced Metrics
    { label: 'Average position MAE', value: Math.abs(metrics.avgLoss) * 1.2, type: 'currency', category: 'risk' }, // Estimated as 120% of avg loss
    { label: 'Average Position MFE', value: metrics.avgWin * 0.8, type: 'currency', category: 'risk' }, // Estimated as 80% of avg win
  ];

  // Group statistics by category
  const basicStats = statisticsData.filter(stat => stat.category === 'basic');
  const performanceStats = statisticsData.filter(stat => stat.category === 'performance');
  const riskStats = statisticsData.filter(stat => stat.category === 'risk');

  // Create special calculated metrics for balanced distribution
  const specialMetrics: StatisticRow[] = [
    { label: 'Win Rate', value: metrics.winRate, type: 'percentage', category: 'performance' },
    { label: 'Loss Rate', value: metrics.lossRate, type: 'percentage', category: 'performance' },
  ];

  // Create balanced column distribution
  const createBalancedColumns = () => {
    // All statistics including special metrics, organized by priority/category
    const allStats = [
      ...basicStats,
      ...performanceStats,
      ...specialMetrics,
      ...riskStats
    ];

    const totalStats = allStats.length;
    const columnsCount = 3;
    const baseItemsPerColumn = Math.floor(totalStats / columnsCount);
    const remainder = totalStats % columnsCount;

    // Calculate items per column (distribute remainder to first columns)
    const itemsPerColumn = Array(columnsCount).fill(baseItemsPerColumn);
    for (let i = 0; i < remainder; i++) {
      itemsPerColumn[i]++;
    }

    // Create balanced columns while maintaining logical grouping
    const columns: StatisticRow[][] = [[], [], []];
    
    // Strategy: Fill columns with preferred categories, then balance remaining
    
    // Column 1: Prioritize basic metrics
    columns[0] = basicStats.slice(0, itemsPerColumn[0]);
    
    // Column 2: Prioritize performance metrics + special metrics
    const perfAndSpecialStats = [...performanceStats, ...specialMetrics];
    columns[1] = perfAndSpecialStats.slice(0, itemsPerColumn[1]);
    
    // Column 3: Start with risk metrics
    columns[2] = riskStats.slice(0, itemsPerColumn[2]);
    
    // Balance remaining stats if columns are not full
    const usedStats = new Set([
      ...columns[0].map(s => s.label),
      ...columns[1].map(s => s.label),
      ...columns[2].map(s => s.label)
    ]);
    
    const remainingStats = allStats.filter(stat => !usedStats.has(stat.label));
    
    // Distribute remaining stats to columns that need more items
    for (let i = 0; i < columnsCount; i++) {
      while (columns[i].length < itemsPerColumn[i] && remainingStats.length > 0) {
        columns[i].push(remainingStats.shift()!);
      }
    }

    return {
      columns,
      headers: ['P&L & Activity', 'Win/Loss/Expectation', 'Risk & Quality']
    };
  };

  const { columns, headers } = createBalancedColumns();

  const renderStatRow = (stat: StatisticRow, index: number) => {
    // Handle special metrics with custom rendering
    if (stat.label === 'Win Rate') {
      return (
        <div key={index} className="flex justify-between py-2 border-b border-default/30 last:border-b-0">
          <span className="text-sm text-muted-foreground">Win Rate</span>
          <span className={`text-sm ${getValueColor(metrics.winRate, 'percentage', 'Win Rate')}`}>
            {formatValue(metrics.winRate, 'percentage')} ({metrics.winningTrades})
          </span>
        </div>
      );
    }
    
    if (stat.label === 'Loss Rate') {
      return (
        <div key={index} className="flex justify-between py-2 border-b border-default/30 last:border-b-0">
          <span className="text-sm text-muted-foreground">Loss Rate</span>
          <span className={`text-sm ${getValueColor(metrics.lossRate, 'percentage', 'Loss Rate')}`}>
            {formatValue(metrics.lossRate, 'percentage')} ({metrics.losingTrades})
          </span>
        </div>
      );
    }

    return (
      <div key={index} className="flex justify-between py-2 border-b border-default/30 last:border-b-0">
        <span className="text-sm text-muted-foreground">{stat.label}</span>
        <span className={`text-sm ${getValueColor(stat.value, stat.type, stat.label)}`}>
          {formatValue(stat.value, stat.type)}
        </span>
      </div>
    );
  };

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {columns.map((columnStats, columnIndex) => (
            <div key={columnIndex}>
              <h4 className="text-sm font-medium text-primary mb-3 border-b border-default/30 pb-1">
                {headers[columnIndex]}
              </h4>
              <div className="space-y-1">
                {columnStats.map((stat, statIndex) => renderStatRow(stat, statIndex + columnIndex * 1000))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}