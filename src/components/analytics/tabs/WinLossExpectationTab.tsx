'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsTabContentProps } from '../AnalyticsTabsSection';

// Import the new chart components
// TODO: Create these chart components
// import WinLossRatioChart from '@/components/charts/WinLossRatioChart';
// import WinLossPnlComparisonChart from '@/components/charts/WinLossPnlComparisonChart';
// import TradeExpectationChart from '@/components/charts/TradeExpectationChart';
// import CumulativePnlChart from '@/components/charts/CumulativePnlChart';
// import CumulativeDrawdownChart from '@/components/charts/CumulativeDrawdownChart';

interface WinLossExpectationData {
  winLossRatio: {
    wins: number;
    losses: number;
    scratches: number;
    winRate: number;
    lossRate: number;
    scratchRate: number;
    totalTrades: number;
  };
  winLossPnlComparison: {
    avgWin: number;
    avgLoss: number;
    totalWins: number;
    totalLosses: number;
    largestWin: number;
    largestLoss: number;
    winCount: number;
    lossCount: number;
  };
  tradeExpectation: {
    expectation: number;
    expectationPerTrade: number;
    profitFactor: number;
    payoffRatio: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    kellyPercentage: number;
  };
  cumulativePnl: Array<{
    date: string;
    value: number;
    trades: number;
  }>;
  cumulativeDrawdown: Array<{
    date: string;
    drawdown: number;
    drawdownPercent: number;
    underwater: number;
  }>;
  metadata: {
    totalTrades: number;
    tradingDays: number;
    dataQuality: 'complete' | 'partial' | 'insufficient';
  };
}

export default function WinLossExpectationTab({ data }: AnalyticsTabContentProps) {
  const [dashboardData, setDashboardData] = useState<WinLossExpectationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract filters from the analytics data if available
  const filters = useMemo(() => {
    const params = new URLSearchParams();
    
    // Add filters based on context or data
    // You might need to adjust these based on your actual data structure
    if (data.filters?.dateFrom) params.append('from', data.filters.dateFrom);
    if (data.filters?.dateTo) params.append('to', data.filters.dateTo);
    if (data.filters?.symbol) params.append('symbol', data.filters.symbol);
    if (data.filters?.side) params.append('side', data.filters.side);
    
    return params.toString();
  }, [data]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/reports/winloss-expectation${filters ? `?${filters}` : ''}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        const result = await response.json();
        setDashboardData(result);
      } catch (err) {
        console.error('Error fetching win/loss expectation data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filters]);

  // Show data quality warning if applicable
  const showDataQualityWarning = dashboardData?.metadata?.dataQuality === 'insufficient';

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard data...</div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Quality Warning */}
      {showDataQualityWarning && (
        <Card className="bg-yellow-900/20 border-yellow-600/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 text-sm">⚠️</span>
              <span className="text-yellow-600 text-sm">
                Limited data available ({dashboardData?.metadata?.totalTrades || 0} trades across {dashboardData?.metadata?.tradingDays || 0} days). 
                Statistics may not be fully representative.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* First Row: Win/Loss Ratio and P&L Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-default rounded-lg p-6 h-[350px] flex items-center justify-center">
          <span className="text-muted">Win/Loss Ratio Chart - Coming Soon</span>
        </div>
        
        <div className="bg-surface border border-default rounded-lg p-6 h-[350px] flex items-center justify-center">
          <span className="text-muted">Win/Loss P&L Comparison Chart - Coming Soon</span>
        </div>
      </div>

      {/* Second Row: Trade Expectation (Full Width) */}
      <div className="bg-surface border border-default rounded-lg p-6 h-[320px] flex items-center justify-center">
        <span className="text-muted">Trade Expectation Chart - Coming Soon</span>
      </div>

      {/* Third Row: Cumulative P&L and Drawdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-default rounded-lg p-6 h-[350px] flex items-center justify-center">
          <span className="text-muted">Cumulative P&L Chart - Coming Soon</span>
        </div>
        
        <div className="bg-surface border border-default rounded-lg p-6 h-[350px] flex items-center justify-center">
          <span className="text-muted">Cumulative Drawdown Chart - Coming Soon</span>
        </div>
      </div>

      {/* Statistics Summary Card */}
      <Card className="bg-surface border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-primary">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Total Trades</div>
              <div className="text-lg font-semibold text-primary">
                {dashboardData?.metadata?.totalTrades || 0}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className={`text-lg font-semibold ${
                (dashboardData?.winLossRatio?.winRate || 0) >= 50 ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}>
                {(dashboardData?.winLossRatio?.winRate || 0).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Profit Factor</div>
              <div className={`text-lg font-semibold ${
                (dashboardData?.tradeExpectation?.profitFactor || 0) > 1 ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}>
                {(dashboardData?.tradeExpectation?.profitFactor || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Expectancy</div>
              <div className={`text-lg font-semibold ${
                (dashboardData?.tradeExpectation?.expectationPerTrade || 0) > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}>
                ${(dashboardData?.tradeExpectation?.expectationPerTrade || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg Win</div>
              <div className="text-lg font-semibold text-[#16A34A]">
                ${(dashboardData?.tradeExpectation?.avgWin || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg Loss</div>
              <div className="text-lg font-semibold text-[#DC2626]">
                ${(dashboardData?.tradeExpectation?.avgLoss || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Payoff Ratio</div>
              <div className="text-lg font-semibold text-primary">
                {(dashboardData?.tradeExpectation?.payoffRatio || 0).toFixed(2)}:1
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Kelly %</div>
              <div className="text-lg font-semibold text-[#3B82F6]">
                {(dashboardData?.tradeExpectation?.kellyPercentage || 0).toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}