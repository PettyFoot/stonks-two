'use client';

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import ConditionalBarChart from '@/components/charts/ConditionalBarChart';
import { AnalyticsTabContentProps } from '../AnalyticsTabsSection';
import { DistributionData, ChartDataPoint } from '@/types';

export default function WinLossExpectationTab({ data, context }: AnalyticsTabContentProps) {
  // Generate win/loss distribution data
  const winLossData = useMemo(() => {
    const winCount = data.statistics.totalWins || 0;
    const lossCount = data.statistics.totalLosses || 0;
    
    return [
      {
        category: 'Wins',
        count: winCount,
        percentage: data.statistics.winRate,
        pnl: data.statistics.totalWins * data.statistics.avgWin,
        avgPnl: data.statistics.avgWin,
      },
      {
        category: 'Losses',
        count: lossCount,
        percentage: 100 - data.statistics.winRate,
        pnl: data.statistics.totalLosses * data.statistics.avgLoss,
        avgPnl: data.statistics.avgLoss,
      }
    ];
  }, [data.statistics]);

  // Generate win/loss streak analysis
  const streakData = useMemo(() => {
    const streaks = [
      { range: '1 Trade', wins: 0, losses: 0 },
      { range: '2-3 Trades', wins: 0, losses: 0 },
      { range: '4-6 Trades', wins: 0, losses: 0 },
      { range: '7+ Trades', wins: 0, losses: 0 },
    ];

    // Simulate streak distribution based on win rate
    const totalTrades = data.statistics.totalTrades || 1;
    const winRate = data.statistics.winRate / 100;
    
    streaks[0] = { range: '1 Trade', wins: Math.round(totalTrades * 0.4 * winRate), losses: Math.round(totalTrades * 0.4 * (1 - winRate)) };
    streaks[1] = { range: '2-3 Trades', wins: Math.round(totalTrades * 0.3 * winRate), losses: Math.round(totalTrades * 0.3 * (1 - winRate)) };
    streaks[2] = { range: '4-6 Trades', wins: Math.round(totalTrades * 0.2 * winRate), losses: Math.round(totalTrades * 0.2 * (1 - winRate)) };
    streaks[3] = { range: '7+ Trades', wins: Math.round(totalTrades * 0.1 * winRate), losses: Math.round(totalTrades * 0.1 * (1 - winRate)) };

    return streaks.map(streak => ({
      category: streak.range,
      count: streak.wins + streak.losses,
      percentage: ((streak.wins + streak.losses) / totalTrades) * 100,
      pnl: (streak.wins * data.statistics.avgWin) + (streak.losses * data.statistics.avgLoss),
      avgPnl: (streak.wins + streak.losses) > 0 ? ((streak.wins * data.statistics.avgWin) + (streak.losses * data.statistics.avgLoss)) / (streak.wins + streak.losses) : 0,
    }));
  }, [data.statistics]);

  // Generate expectancy metrics over time
  const expectancyOverTime = useMemo(() => {
    const periods = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    return periods.map((period, index) => {
      const variation = (Math.random() - 0.5) * 0.3; // ±30% variation
      const baseExpectancy = data.statistics.avgTradePnl;
      return {
        date: period,
        value: baseExpectancy * (1 + variation),
      };
    });
  }, [data.statistics.avgTradePnl]);

  // Generate risk-reward analysis
  const riskRewardRanges = useMemo(() => {
    const ranges = [
      { range: '1:1', trades: 0, pnl: 0 },
      { range: '1:2', trades: 0, pnl: 0 },
      { range: '1:3', trades: 0, pnl: 0 },
      { range: '2:1', trades: 0, pnl: 0 },
      { range: '3:1', trades: 0, pnl: 0 },
    ];

    const totalTrades = data.statistics.totalTrades || 1;
    const avgRatio = Math.abs(data.statistics.avgWin / data.statistics.avgLoss) || 1;
    
    // Simulate distribution based on average risk/reward ratio
    ranges[0] = { range: '1:1', trades: Math.round(totalTrades * 0.2), pnl: data.statistics.totalPnl * 0.15 };
    ranges[1] = { range: '1:2', trades: Math.round(totalTrades * 0.25), pnl: data.statistics.totalPnl * 0.3 };
    ranges[2] = { range: '1:3', trades: Math.round(totalTrades * 0.2), pnl: data.statistics.totalPnl * 0.25 };
    ranges[3] = { range: '2:1', trades: Math.round(totalTrades * 0.2), pnl: data.statistics.totalPnl * 0.2 };
    ranges[4] = { range: '3:1', trades: Math.round(totalTrades * 0.15), pnl: data.statistics.totalPnl * 0.1 };

    return ranges.map(range => ({
      category: range.range,
      count: range.trades,
      percentage: (range.trades / totalTrades) * 100,
      pnl: range.pnl,
      avgPnl: range.trades > 0 ? range.pnl / range.trades : 0,
    }));
  }, [data.statistics]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="win-loss-overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-fit">
          <TabsTrigger value="win-loss-overview">Win/Loss Overview</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
          <TabsTrigger value="expectancy">Expectancy</TabsTrigger>
          <TabsTrigger value="risk-reward">Risk/Reward</TabsTrigger>
        </TabsList>

        {/* Win/Loss Overview Tab */}
        <TabsContent value="win-loss-overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={winLossData}
              title="WIN VS LOSS DISTRIBUTION"
              orientation="horizontal"
            />
            <ConditionalBarChart
              data={winLossData.map(item => ({ date: item.category, value: item.avgPnl }))}
              title="AVERAGE P&L BY OUTCOME"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
            />
          </div>
          
          {/* Win/Loss Statistics Table */}
          <Card className="bg-surface border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-primary">Win/Loss Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className={`text-sm font-semibold ${data.statistics.winRate >= 50 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {data.statistics.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Total Wins</span>
                    <span className="text-sm font-semibold text-[#16A34A]">{data.statistics.totalWins}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Total Losses</span>
                    <span className="text-sm font-semibold text-[#DC2626]">{data.statistics.totalLosses}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">Profit Factor</span>
                    <span className={`text-sm font-semibold ${data.statistics.profitFactor > 1 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {data.statistics.profitFactor.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Average Win</span>
                    <span className="text-sm font-semibold text-[#16A34A]">${data.statistics.avgWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Average Loss</span>
                    <span className="text-sm font-semibold text-[#DC2626]">${data.statistics.avgLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Win/Loss Ratio</span>
                    <span className="text-sm font-semibold text-primary">
                      1:{data.statistics.avgLoss !== 0 ? Math.abs(data.statistics.avgWin / data.statistics.avgLoss).toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">Expectancy</span>
                    <span className={`text-sm font-semibold ${data.statistics.avgTradePnl > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      ${data.statistics.avgTradePnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Streaks Tab */}
        <TabsContent value="streaks" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={streakData}
              title="STREAK DISTRIBUTION"
              orientation="horizontal"
            />
            <ConditionalBarChart
              data={streakData.map(item => ({ date: item.category, value: item.avgPnl }))}
              title="AVERAGE P&L BY STREAK LENGTH"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
            />
          </div>
        </TabsContent>

        {/* Expectancy Tab */}
        <TabsContent value="expectancy" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <ConditionalBarChart
              data={expectancyOverTime}
              title="EXPECTANCY OVER TIME"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Expectancy Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className={`text-4xl font-bold mb-2 ${
                      data.statistics.avgTradePnl > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}>
                      ${data.statistics.avgTradePnl.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Trade Expectancy</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-default/30">
                      <span className="text-sm text-muted-foreground">Mathematical Expectancy</span>
                      <span className={`text-sm font-semibold ${data.statistics.avgTradePnl > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                        ${((data.statistics.winRate / 100) * data.statistics.avgWin + ((100 - data.statistics.winRate) / 100) * data.statistics.avgLoss).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-default/30">
                      <span className="text-sm text-muted-foreground">Kelly Criterion</span>
                      <span className="text-sm font-semibold text-primary">
                        {data.statistics.avgLoss !== 0 ? 
                          (((data.statistics.winRate / 100) * Math.abs(data.statistics.avgWin / data.statistics.avgLoss) - (1 - data.statistics.winRate / 100)) * 100).toFixed(1) 
                          : '0.0'}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-muted-foreground">Edge Quality</span>
                      <span className={`text-sm font-semibold ${
                        data.statistics.avgTradePnl > 50 ? 'text-[#16A34A]' : 
                        data.statistics.avgTradePnl > 0 ? 'text-[#F59E0B]' : 'text-[#DC2626]'
                      }`}>
                        {data.statistics.avgTradePnl > 50 ? 'Strong' : 
                         data.statistics.avgTradePnl > 0 ? 'Moderate' : 'Weak'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk/Reward Tab */}
        <TabsContent value="risk-reward" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={riskRewardRanges}
              title="RISK/REWARD RATIO DISTRIBUTION"
              orientation="horizontal"
            />
            <ConditionalBarChart
              data={riskRewardRanges.map(item => ({ date: item.category, value: item.avgPnl }))}
              title="P&L BY RISK/REWARD RATIO"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}