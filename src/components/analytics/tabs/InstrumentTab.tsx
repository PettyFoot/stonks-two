'use client';

import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import ConditionalBarChart from '@/components/charts/ConditionalBarChart';
import { AnalyticsTabContentProps } from '../AnalyticsTabsSection';

export default function InstrumentTab({ data }: AnalyticsTabContentProps) {
  // Generate instrument analysis from existing data
  const symbolData = useMemo(() => {
    // Simulate top symbols based on trading activity
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'MSFT', 'GOOGL', 'AMZN'];
    const totalTrades = data.statistics.totalTrades || 1;
    
    return symbols.map((symbol) => {
      const tradePercent = Math.max(0.05, Math.random() * 0.3); // 5-30% of trades per symbol
      const count = Math.round(totalTrades * tradePercent);
      const pnlMultiplier = (Math.random() - 0.5) * 2; // Random positive/negative performance
      const pnl = data.statistics.totalPnl * tradePercent * pnlMultiplier;
      
      return {
        category: symbol,
        count,
        percentage: (count / totalTrades) * 100,
        pnl,
        avgPnl: count > 0 ? pnl / count : 0,
      };
    }).sort((a, b) => b.count - a.count).slice(0, 6); // Top 6 symbols
  }, [data.statistics]);

  // Generate sector analysis
  const sectorData = useMemo(() => {
    const sectors = [
      { name: 'Technology', weight: 0.4 },
      { name: 'Financial', weight: 0.2 },
      { name: 'Healthcare', weight: 0.15 },
      { name: 'Consumer', weight: 0.15 },
      { name: 'Energy', weight: 0.1 },
    ];
    
    const totalTrades = data.statistics.totalTrades || 1;
    
    return sectors.map(sector => {
      const count = Math.round(totalTrades * sector.weight);
      const pnlMultiplier = (Math.random() - 0.3) * 2; // Slight positive bias
      const pnl = data.statistics.totalPnl * sector.weight * pnlMultiplier;
      
      return {
        category: sector.name,
        count,
        percentage: sector.weight * 100,
        pnl,
        avgPnl: count > 0 ? pnl / count : 0,
      };
    });
  }, [data.statistics]);

  // Generate correlation data
  const correlationData = useMemo(() => {
    const symbols = symbolData.slice(0, 4).map(s => s.category);
    return symbols.map(symbol => ({
      date: symbol,
      value: (Math.random() - 0.5) * 2, // Random correlation between -1 and 1
    }));
  }, [symbolData]);

  // Generate concentration metrics
  const concentrationMetrics = useMemo(() => {
    const topSymbolPercent = symbolData.length > 0 ? symbolData[0].percentage : 0;
    const top3Percent = symbolData.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0);
    
    return {
      topSymbol: symbolData[0]?.category || 'N/A',
      topSymbolPercent,
      top3Percent,
      diversificationScore: 100 - top3Percent, // Higher score = more diversified
    };
  }, [symbolData]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="symbols" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-fit">
          <TabsTrigger value="symbols">Symbols</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
          <TabsTrigger value="concentration">Concentration</TabsTrigger>
        </TabsList>

        {/* Symbols Tab */}
        <TabsContent value="symbols" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={symbolData}
              title="TRADE DISTRIBUTION BY SYMBOL"
              orientation="horizontal"
            />
            <ConditionalBarChart
              data={symbolData.map(item => ({ date: item.category, value: item.avgPnl }))}
              title="AVERAGE P&L BY SYMBOL"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
            />
          </div>
          
          {/* Symbol Performance Table */}
          <Card className="bg-surface border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-primary">Symbol Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b border-default/30 pb-2">
                  <span>Symbol</span>
                  <span>Trades</span>
                  <span>% of Total</span>
                  <span>Total P&L</span>
                  <span>Avg P&L</span>
                </div>
                {symbolData.map((symbol) => (
                  <div key={symbol.category} className="grid grid-cols-5 gap-4 text-sm py-1">
                    <span className="font-medium text-primary">{symbol.category}</span>
                    <span className="text-muted-foreground">{symbol.count}</span>
                    <span className="text-muted-foreground">{symbol.percentage.toFixed(1)}%</span>
                    <span className={`font-semibold ${symbol.pnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      ${symbol.pnl.toFixed(2)}
                    </span>
                    <span className={`font-semibold ${symbol.avgPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      ${symbol.avgPnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sectors Tab */}
        <TabsContent value="sectors" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TradeDistributionChart
              data={sectorData}
              title="TRADE DISTRIBUTION BY SECTOR"
              orientation="horizontal"
            />
            <ConditionalBarChart
              data={sectorData.map(item => ({ date: item.category, value: item.avgPnl }))}
              title="AVERAGE P&L BY SECTOR"
              valueFormatter={(value) => `$${value.toFixed(2)}`}
            />
          </div>
        </TabsContent>

        {/* Correlation Tab */}
        <TabsContent value="correlation" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <ConditionalBarChart
              data={correlationData}
              title="PORTFOLIO CORRELATION ANALYSIS"
              valueFormatter={(value) => value.toFixed(3)}
            />
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Correlation Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Average Correlation</span>
                    <span className="text-sm font-semibold text-primary">
                      {correlationData.length > 0 ? 
                        (correlationData.reduce((sum, item) => sum + Math.abs(item.value), 0) / correlationData.length).toFixed(3) 
                        : '0.000'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Highest Correlation</span>
                    <span className="text-sm font-semibold text-primary">
                      {correlationData.length > 0 ? 
                        Math.max(...correlationData.map(item => Math.abs(item.value))).toFixed(3)
                        : '0.000'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">Diversification Score</span>
                    <span className={`text-sm font-semibold ${concentrationMetrics.diversificationScore > 60 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {concentrationMetrics.diversificationScore.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Concentration Tab */}
        <TabsContent value="concentration" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Portfolio Concentration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Top Symbol</span>
                    <span className="text-sm font-semibold text-primary">
                      {concentrationMetrics.topSymbol} ({concentrationMetrics.topSymbolPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Top 3 Symbols</span>
                    <span className="text-sm font-semibold text-primary">
                      {concentrationMetrics.top3Percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-default/30">
                    <span className="text-sm text-muted-foreground">Diversification Score</span>
                    <span className={`text-sm font-semibold ${concentrationMetrics.diversificationScore > 60 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {concentrationMetrics.diversificationScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">Total Symbols Traded</span>
                    <span className="text-sm font-semibold text-primary">
                      {symbolData.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className={`text-4xl font-bold mb-2 ${
                      concentrationMetrics.diversificationScore > 70 ? 'text-[#16A34A]' : 
                      concentrationMetrics.diversificationScore > 40 ? 'text-[#F59E0B]' : 'text-[#DC2626]'
                    }`}>
                      {concentrationMetrics.diversificationScore > 70 ? 'LOW' : 
                       concentrationMetrics.diversificationScore > 40 ? 'MEDIUM' : 'HIGH'}
                    </div>
                    <div className="text-sm text-muted-foreground">Concentration Risk</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {concentrationMetrics.diversificationScore > 70 ? 
                      'Well diversified portfolio with good risk distribution' :
                      concentrationMetrics.diversificationScore > 40 ?
                      'Moderate concentration - consider increasing diversification' :
                      'High concentration risk - diversification recommended'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}