'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartContainer from './ChartContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  aggregateByDayOfWeek, 
  aggregateByHourOfDay, 
  aggregateByMonthOfYear,
  aggregateByDuration,
  aggregateByIntradayDuration 
} from '@/lib/reportCalculations';

interface TabsSectionProps {
  trades?: Array<Record<string, unknown>>;
}

export default function TabsSection({ trades = [] }: TabsSectionProps) {
  // Generate mock trades data for demonstration
  const mockTrades = React.useMemo(() => {
    if (trades.length > 0) return trades;
    
    // Generate 100 mock trades for demonstration
    return Array.from({ length: 100 }, (_, i) => {
      const entryDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      entryDate.setHours(7 + Math.floor(Math.random() * 14)); // 7 AM to 8 PM
      
      return {
        id: `trade-${i}`,
        entryDate: entryDate.toISOString(),
        date: entryDate.toISOString(),
        pnl: (Math.random() - 0.45) * 500, // Slightly positive bias
        timeInTrade: Math.floor(Math.random() * 7200), // 0 to 2 hours in seconds
        symbol: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'][Math.floor(Math.random() * 5)],
        quantity: Math.floor(Math.random() * 100) + 10,
        status: 'CLOSED'
      };
    });
  }, [trades]);

  // Calculate aggregated data for charts
  const dayOfWeekData = React.useMemo(() => aggregateByDayOfWeek(mockTrades), [mockTrades]);
  const hourOfDayData = React.useMemo(() => aggregateByHourOfDay(mockTrades), [mockTrades]);
  const monthOfYearData = React.useMemo(() => aggregateByMonthOfYear(mockTrades), [mockTrades]);
  const durationData = React.useMemo(() => aggregateByDuration(mockTrades), [mockTrades]);
  const intradayDurationData = React.useMemo(() => aggregateByIntradayDuration(mockTrades), [mockTrades]);

  /* 
   * Product Manager Review Point:
   * Tab structure follows user workflow:
   * 1. Days/Times - When to trade
   * 2. Price/Volume - Market conditions (future)
   * 3. Instrument - What to trade (future)
   * 4. Win/Loss/Expectation - Performance analysis
   */

  return (
    <Tabs defaultValue="days-times" className="space-y-4">
      <TabsList className="grid grid-cols-4 w-full max-w-2xl">
        <TabsTrigger value="days-times">Days/Times</TabsTrigger>
        <TabsTrigger value="price-volume">Price/Volume</TabsTrigger>
        <TabsTrigger value="instrument">Instrument</TabsTrigger>
        <TabsTrigger value="win-loss">Win/Loss/Expectation</TabsTrigger>
      </TabsList>

      {/* Days/Times Tab - 4 Charts */}
      <TabsContent value="days-times" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trade Distribution by Day of Week */}
          <ChartContainer
            title="TRADE DISTRIBUTION BY DAY OF WEEK"
            data={dayOfWeekData.distribution}
            chartType="distribution"
            valueType="shares"
            height={300}
            minWidth={400}
          />
          
          {/* Performance by Day of Week */}
          <ChartContainer
            title="PERFORMANCE BY DAY OF WEEK"
            data={dayOfWeekData.performance}
            chartType="performance"
            valueType="currency"
            height={300}
            minWidth={400}
          />
          
          {/* Trade Distribution by Hour of Day */}
          <ChartContainer
            title="TRADE DISTRIBUTION BY HOUR OF DAY"
            data={hourOfDayData.distribution}
            chartType="distribution"
            valueType="shares"
            height={300}
            minWidth={500}
            enableScroll={true}
          />
          
          {/* Performance by Hour of Day */}
          <ChartContainer
            title="PERFORMANCE BY HOUR OF DAY"
            data={hourOfDayData.performance}
            chartType="performance"
            valueType="currency"
            height={300}
            minWidth={500}
            enableScroll={true}
          />
        </div>
      </TabsContent>

      {/* Win/Loss/Expectation Tab - 6 Charts */}
      <TabsContent value="win-loss" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trade Distribution by Month of Year */}
          <ChartContainer
            title="TRADE DISTRIBUTION BY MONTH OF YEAR"
            data={monthOfYearData.distribution}
            chartType="distribution"
            valueType="shares"
            height={300}
            minWidth={500}
            enableScroll={true}
          />
          
          {/* Performance by Month of Year */}
          <ChartContainer
            title="PERFORMANCE BY MONTH OF YEAR"
            data={monthOfYearData.performance}
            chartType="performance"
            valueType="currency"
            height={300}
            minWidth={500}
            enableScroll={true}
          />
          
          {/* Trade Distribution by Duration */}
          <ChartContainer
            title="TRADE DISTRIBUTION BY DURATION"
            data={durationData.distribution}
            chartType="distribution"
            valueType="shares"
            height={300}
            minWidth={450}
            enableScroll={true}
          />
          
          {/* Performance by Duration */}
          <ChartContainer
            title="PERFORMANCE BY DURATION"
            data={durationData.performance}
            chartType="performance"
            valueType="currency"
            height={300}
            minWidth={450}
            enableScroll={true}
          />
          
          {/* Trade Distribution by Intraday Duration */}
          <ChartContainer
            title="TRADE DISTRIBUTION BY INTRADAY DURATION"
            data={intradayDurationData.distribution}
            chartType="distribution"
            valueType="shares"
            height={300}
            minWidth={450}
            enableScroll={true}
          />
          
          {/* Performance by Intraday Duration */}
          <ChartContainer
            title="PERFORMANCE BY INTRADAY DURATION"
            data={intradayDurationData.performance}
            chartType="performance"
            valueType="currency"
            height={300}
            minWidth={450}
            enableScroll={true}
          />
        </div>
      </TabsContent>

      {/* Price/Volume Tab - Placeholder for future implementation */}
      <TabsContent value="price-volume" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                PERFORMANCE BY ENTRY PRICE RANGE
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                PERFORMANCE BY VOLUME PROFILE
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                AVERAGE TRADE SIZE BY PRICE
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                WIN RATE BY VOLUME QUINTILE
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Instrument Tab - Placeholder for future implementation */}
      <TabsContent value="instrument" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                PERFORMANCE BY SYMBOL
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                TRADE COUNT BY SYMBOL
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                WIN RATE BY SYMBOL
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-default">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary">
                AVERAGE P&L BY SECTOR
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <span className="text-muted">Chart coming soon</span>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

/* 
 * Backend Engineer Review Point:
 * API endpoints needed for real data:
 * 
 * /api/reports/time-analysis
 * - Returns aggregated data by day of week and hour
 * 
 * /api/reports/duration-analysis  
 * - Returns trade distribution and performance by duration buckets
 * 
 * /api/reports/monthly-analysis
 * - Returns monthly distribution and performance data
 * 
 * Each endpoint should accept filter parameters from GlobalFilterContext
 */