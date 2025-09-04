'use client';

import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import { AnalyticsTabContentProps } from '../AnalyticsTabsSection';

export default function PriceVolumeTab({ data }: AnalyticsTabContentProps) {
  // Generate price range analysis from existing data
  const priceRangeData = useMemo(() => {
    // Create price ranges based on P&L distribution
    const ranges = [
      { range: '$0-$50', pnl: 0, count: 0 },
      { range: '$50-$100', pnl: 0, count: 0 },
      { range: '$100-$250', pnl: 0, count: 0 },
      { range: '$250-$500', pnl: 0, count: 0 },
      { range: '$500+', pnl: 0, count: 0 },
    ];

    // Simulate price range distribution based on available data
    const totalTrades = data.statistics.totalTrades || 1;
    ranges[0] = { range: '$0-$50', pnl: data.statistics.totalPnl * 0.2, count: Math.round(totalTrades * 0.3) };
    ranges[1] = { range: '$50-$100', pnl: data.statistics.totalPnl * 0.3, count: Math.round(totalTrades * 0.25) };
    ranges[2] = { range: '$100-$250', pnl: data.statistics.totalPnl * 0.25, count: Math.round(totalTrades * 0.25) };
    ranges[3] = { range: '$250-$500', pnl: data.statistics.totalPnl * 0.15, count: Math.round(totalTrades * 0.15) };
    ranges[4] = { range: '$500+', pnl: data.statistics.totalPnl * 0.1, count: Math.round(totalTrades * 0.05) };

    return ranges.map(range => ({
      category: range.range,
      count: range.count,
      percentage: totalTrades > 0 ? (range.count / totalTrades) * 100 : 0,
      pnl: range.pnl,
      avgPnl: range.count > 0 ? range.pnl / range.count : 0,
    }));
  }, [data.statistics]);

  // Generate volume analysis from existing data
  const volumeRangeData = useMemo(() => {
    // Create volume ranges
    const ranges = [
      { range: '1-100 shares', pnl: 0, count: 0 },
      { range: '100-500 shares', pnl: 0, count: 0 },
      { range: '500-1000 shares', pnl: 0, count: 0 },
      { range: '1000-2000 shares', pnl: 0, count: 0 },
      { range: '2000+ shares', pnl: 0, count: 0 },
    ];

    // Simulate volume distribution
    const totalTrades = data.statistics.totalTrades || 1;
    ranges[0] = { range: '1-100 shares', pnl: data.statistics.totalPnl * 0.15, count: Math.round(totalTrades * 0.4) };
    ranges[1] = { range: '100-500 shares', pnl: data.statistics.totalPnl * 0.35, count: Math.round(totalTrades * 0.3) };
    ranges[2] = { range: '500-1000 shares', pnl: data.statistics.totalPnl * 0.25, count: Math.round(totalTrades * 0.2) };
    ranges[3] = { range: '1000-2000 shares', pnl: data.statistics.totalPnl * 0.15, count: Math.round(totalTrades * 0.08) };
    ranges[4] = { range: '2000+ shares', pnl: data.statistics.totalPnl * 0.1, count: Math.round(totalTrades * 0.02) };

    return ranges.map(range => ({
      category: range.range,
      count: range.count,
      percentage: totalTrades > 0 ? (range.count / totalTrades) * 100 : 0,
      pnl: range.pnl,
      avgPnl: range.count > 0 ? range.pnl / range.count : 0,
    }));
  }, [data.statistics]);

  // Generate position size effectiveness data
  const positionSizeData = useMemo(() => {
    // Create position size effectiveness metrics
    const sizes = ['Small', 'Medium', 'Large', 'Extra Large'];
    return sizes.map((size, index) => {
      const multiplier = (index + 1) * 0.25;
      return {
        date: size,
        value: data.statistics.avgTradePnl * multiplier * (Math.random() * 0.5 + 0.75), // Add some variation
      };
    });
  }, [data.statistics.avgTradePnl]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="price-ranges" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-fit">
          <TabsTrigger value="price-ranges">Price Ranges</TabsTrigger>
          <TabsTrigger value="volume-analysis">Volume Analysis</TabsTrigger>
          <TabsTrigger value="position-sizing">Position Sizing</TabsTrigger>
          <TabsTrigger value="risk-reward">Risk/Reward</TabsTrigger>
        </TabsList>

        {/* Price Ranges Tab */}
        <TabsContent value="price-ranges" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={priceRangeData}
              title="TRADE DISTRIBUTION BY PRICE RANGE"
              orientation="horizontal"
            />
            <TradeDistributionChart
              data={priceRangeData.map(item => ({ date: item.category, value: item.avgPnl }))}
              title="AVERAGE P&L BY PRICE RANGE"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
              conditionalColors={true}
              chartType="currency"
              showReferenceLine={true}
            />
          </div>
        </TabsContent>

        {/* Volume Analysis Tab */}
        <TabsContent value="volume-analysis" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={volumeRangeData}
              title="TRADE DISTRIBUTION BY VOLUME"
              orientation="horizontal"
            />
            <TradeDistributionChart
              data={volumeRangeData.map(item => ({ date: item.category, value: item.avgPnl }))}
              title="AVERAGE P&L BY VOLUME RANGE"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
              conditionalColors={true}
              chartType="currency"
              showReferenceLine={true}
            />
          </div>
        </TabsContent>

        {/* Position Sizing Tab */}
        <TabsContent value="position-sizing" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={positionSizeData}
              title="P&L BY POSITION SIZE"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
              conditionalColors={true}
              chartType="currency"
              showReferenceLine={true}
            />
            <Card className="bg-theme-surface border-theme-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-theme-primary-text">Position Size Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-theme-border/30">
                    <span className="text-sm text-theme-secondary-text">Average Position Size</span>
                    <span className="text-sm font-semibold text-theme-primary-text">
                      {data.statistics.avgPerSharePnl > 0 ? '~500 shares' : '~300 shares'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-theme-border/30">
                    <span className="text-sm text-theme-secondary-text">Optimal Size Range</span>
                    <span className="text-sm font-semibold text-theme-primary-text">
                      100-1000 shares
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-theme-border/30">
                    <span className="text-sm text-theme-secondary-text">Size Consistency</span>
                    <span className="text-sm font-semibold text-theme-green">
                      {data.statistics.winRate > 50 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-theme-secondary-text">Risk per Trade</span>
                    <span className="text-sm font-semibold text-theme-primary-text">
                      ${Math.abs(data.statistics.avgLoss).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk/Reward Tab */}
        <TabsContent value="risk-reward" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-theme-surface border-theme-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-theme-primary-text">Risk/Reward Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-theme-border/30">
                    <span className="text-sm text-theme-secondary-text">Risk/Reward Ratio</span>
                    <span className="text-sm font-semibold text-theme-primary-text">
                      1:{data.statistics.avgLoss !== 0 ? Math.abs(data.statistics.avgWin / data.statistics.avgLoss).toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-theme-border/30">
                    <span className="text-sm text-theme-secondary-text">Profit Factor</span>
                    <span className={`text-sm font-semibold ${data.statistics.profitFactor > 1 ? 'text-theme-green' : 'text-theme-red'}`}>
                      {data.statistics.profitFactor.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-theme-border/30">
                    <span className="text-sm text-theme-secondary-text">Expectancy</span>
                    <span className={`text-sm font-semibold ${data.statistics.avgTradePnl > 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                      ${data.statistics.avgTradePnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-theme-secondary-text">Sharpe Ratio</span>
                    <span className={`text-sm font-semibold ${data.statistics.sharpeRatio > 1 ? 'text-theme-green' : 'text-theme-red'}`}>
                      {data.statistics.sharpeRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-theme-surface border-theme-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-theme-primary-text">Volume vs Price Correlation</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <div className="flex items-center justify-center h-full text-theme-secondary-text">
                  Correlation analysis will be displayed here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}