'use client';

import React, { useState, useMemo, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EquityChart from '@/components/charts/EquityChart';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import { useReportsData } from '@/hooks/useReportsData';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';

// New enhanced components
import StatsSection from '@/components/reports/StatsSection';
import ChartContainer from '@/components/reports/ChartContainer';
import WinVsLossReport from '@/components/reports/WinVsLossReport';
import { useDetailedReportsData } from '@/hooks/useDetailedReportsData';
import { 
  aggregateByDayOfWeek, 
  aggregateByHourOfDay, 
  aggregateByMonthOfYear,
  aggregateBySimpleDuration,
  aggregateByIntradayDuration,
  aggregateByPrice,
  aggregateByVolume,
  calculateWinLossRatio,
  calculateWinLossPnlComparison,
  calculateTradeExpectation,
  calculateCumulativePnl,
  calculateCumulativeDrawdown
} from '@/lib/reportCalculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Reports() {
  const [pnlType, setPnlType] = useState('Gross');
  const { filters } = useGlobalFilters();

  // Calculate effective date range for display
  const getEffectiveDateRange = useCallback(() => {
    // If custom dates are set, use those
    if (filters.customDateRange?.from && filters.customDateRange?.to) {
      return {
        from: filters.customDateRange.from,
        to: filters.customDateRange.to
      };
    }
    
    // Otherwise use default 30-day range
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  }, [filters.customDateRange]);

  // Format date range for display
  const formatDateRange = () => {
    const range = getEffectiveDateRange();
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    
    return `${fromDate.toLocaleDateString('en-US', options)} - ${toDate.toLocaleDateString('en-US', options)}`;
  };
  
  // Original data hook for existing charts
  const { dailyPnl, aggregatedWinRates, averageDailyPnl, averageDailyPnlOnTradingDays, averageDailyVolume, averageDailyVolumeOnTradingDays, cumulativePnl, loading, error } = useReportsData();
  
  // New enhanced data hook for statistics and new charts
  const { stats, trades, loading: detailedLoading, error: detailedError } = useDetailedReportsData();

  // Calculate average daily P&L for chart display - two bars like Daily Volume
  const dailyPnlData = useMemo(() => {
    if (averageDailyPnl === 0 && averageDailyPnlOnTradingDays === 0) return [];
    return [
      {
        date: 'Total Period',
        value: averageDailyPnl
      },
      {
        date: 'Trading Days',
        value: averageDailyPnlOnTradingDays
      }
    ];
  }, [averageDailyPnl, averageDailyPnlOnTradingDays]);

  // Calculate average daily volume for chart display - now with two bars
  const dailyVolumeData = useMemo(() => {
    if (averageDailyVolume === 0 && averageDailyVolumeOnTradingDays === 0) return [];
    return [
      {
        date: 'Total Period',
        value: averageDailyVolume
      },
      {
        date: 'Trading Days',
        value: averageDailyVolumeOnTradingDays
      }
    ];
  }, [averageDailyVolume, averageDailyVolumeOnTradingDays]);

  // Use aggregated win rates for chart (properly aggregated by time interval)
  const winPercentageData = useMemo(() => {
    return aggregatedWinRates;
  }, [aggregatedWinRates]);

  // Calculate aggregated data for new enhanced charts
  const dayOfWeekData = useMemo(() => aggregateByDayOfWeek(trades), [trades]);
  const hourOfDayData = useMemo(() => aggregateByHourOfDay(trades), [trades]);
  const monthOfYearData = useMemo(() => aggregateByMonthOfYear(trades), [trades]);
  const simpleDurationData = useMemo(() => aggregateBySimpleDuration(trades), [trades]);
  const intradayDurationData = useMemo(() => aggregateByIntradayDuration(trades), [trades]);
  const priceData = useMemo(() => aggregateByPrice(trades), [trades]);
  const volumeData = useMemo(() => aggregateByVolume(trades), [trades]);
  
  // Win/Loss/Expectation data
  const winLossRatio = useMemo(() => calculateWinLossRatio(trades), [trades]);
  const winLossPnlComparison = useMemo(() => calculateWinLossPnlComparison(trades), [trades]);
  const tradeExpectation = useMemo(() => calculateTradeExpectation(trades), [trades]);
  const cumulativePnlData = useMemo(() => {
    const range = getEffectiveDateRange();
    return calculateCumulativePnl(trades, range.from);
  }, [trades, getEffectiveDateRange]);
  const cumulativeDrawdownData = useMemo(() => {
    const range = getEffectiveDateRange();
    return calculateCumulativeDrawdown(trades, range.from);
  }, [trades, getEffectiveDateRange]);

  // Calculate dynamic scale for Trade Expectation chart
  const expectationScale = useMemo(() => {
    const expectation = tradeExpectation.expectation;
    if (expectation === 0) {
      return { min: -5, max: 5, range: 10, ticks: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] };
    }
    
    // Calculate dynamic range with padding
    const absExpectation = Math.abs(expectation);
    const paddedValue = absExpectation * 1.5; // Add 50% padding
    const maxRange = Math.max(paddedValue, 5); // Minimum range of 5
    
    // Round to nice numbers
    const roundedMax = Math.ceil(maxRange);
    const min = -roundedMax;
    const max = roundedMax;
    const range = max - min;
    
    // Generate tick marks
    const tickCount = 9;
    const tickInterval = range / (tickCount - 1);
    const ticks = [];
    for (let i = 0; i < tickCount; i++) {
      ticks.push(min + (i * tickInterval));
    }
    
    return { min, max, range, ticks };
  }, [tradeExpectation.expectation]);

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Reports" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Report Type Selection */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">P&L Type</label>
              <Select value={pnlType} onValueChange={setPnlType}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gross">Gross</SelectItem>
                  <SelectItem value="Net">Net</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted font-medium ml-6">
              Current Period: {formatDateRange()}
            </div>
          </div>
        </div>

        {/* FIRST TAB SYSTEM: Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6 mb-8">
          <TabsList className="flex flex-wrap max-w-2xl justify-center">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="win-vs-loss">Win/Loss</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Original 4 Charts */}
          <TabsContent value="overview" className="space-y-6">
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted">Loading reports data...</div>
              </div>
            )}
            
            {/* Error state */}
            {error && (
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Error: {error}</div>
              </div>
            )}
            
            {/* Four chart grid - Original Overview Charts */}
            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily P&L Average Chart */}
                <TradeDistributionChart 
                  data={dailyPnlData}
                  title="GROSS DAILY P&L"
                  height={300}
                  dataKey="value"
                  chartType="currency"
                  conditionalColors={true}
                  showReferenceLine={true}
                />
                
                {/* Cumulative P&L Chart */}
                <EquityChart 
                  data={cumulativePnl}
                  title="GROSS CUMULATIVE P&L"
                  height={300}
                  useConditionalColors={true}
                />
                
                {/* Daily Volume Chart */}
                <TradeDistributionChart 
                  data={dailyVolumeData}
                  title="DAILY VOLUME"
                  height={300}
                  dataKey="value"
                  chartType="shares"
                  conditionalColors={true}
                />
                
                {/* Win Percentage Chart */}
                <TradeDistributionChart 
                  data={winPercentageData}
                  title="WIN %"
                  height={300}
                  dataKey="value"
                  chartType="percentage"
                  conditionalColors={true}
                />
              </div>
            )}
          </TabsContent>

          {/* Detailed Tab - Contains Statistics and Enhanced Analysis */}
          <TabsContent value="detailed" className="space-y-6">
            {/* STATISTICS SECTION: 22 Trading Metrics */}
            {!detailedLoading && !detailedError && (
              <StatsSection stats={stats} />
            )}

            {/* SECOND TAB SYSTEM: New Enhanced Analysis Tabs (Days/Times, Price/Volume, etc.) */}
            <Tabs defaultValue="days-times" className="space-y-4">
              <div className="flex justify-center">
                <TabsList className="flex flex-wrap w-full max-w-2xl justify-center">
                  <TabsTrigger value="days-times">Days/Times</TabsTrigger>
                  <TabsTrigger value="price-volume">Price/Volume</TabsTrigger>
                  <TabsTrigger value="instrument">Instrument</TabsTrigger>
                  <TabsTrigger value="win-loss">Win/Loss/Expectation</TabsTrigger>
                </TabsList>
              </div>

              {/* Days/Times Tab - 10 Charts Total */}
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
                  
                  {/* Trade Distribution by Hour of Day (24 hours) */}
                  <ChartContainer
                    title="TRADE DISTRIBUTION BY HOUR OF DAY"
                    data={hourOfDayData.distribution}
                    chartType="distribution"
                    valueType="shares"
                    height={300}
                    minWidth={800}
                    enableScroll={true}
                  />
                  
                  {/* Performance by Hour of Day (24 hours) */}
                  <ChartContainer
                    title="PERFORMANCE BY HOUR OF DAY"
                    data={hourOfDayData.performance}
                    chartType="performance"
                    valueType="currency"
                    height={300}
                    minWidth={800}
                    enableScroll={true}
                  />

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
                  
                  {/* Trade Distribution by Duration (Intraday/Multiday) */}
                  <ChartContainer
                    title="TRADE DISTRIBUTION BY DURATION"
                    data={simpleDurationData.distribution}
                    chartType="distribution"
                    valueType="shares"
                    height={300}
                    minWidth={300}
                  />
                  
                  {/* Performance by Duration (Intraday/Multiday) */}
                  <ChartContainer
                    title="PERFORMANCE BY DURATION"
                    data={simpleDurationData.performance}
                    chartType="performance"
                    valueType="currency"
                    height={300}
                    minWidth={300}
                  />
                  
                  {/* Trade Distribution by Intraday Duration */}
                  <ChartContainer
                    title="TRADE DISTRIBUTION BY INTRADAY DURATION"
                    data={intradayDurationData.distribution}
                    chartType="distribution"
                    valueType="shares"
                    height={300}
                    minWidth={600}
                    enableScroll={true}
                  />
                  
                  {/* Performance by Intraday Duration */}
                  <ChartContainer
                    title="PERFORMANCE BY INTRADAY DURATION"
                    data={intradayDurationData.performance}
                    chartType="performance"
                    valueType="currency"
                    height={300}
                    minWidth={600}
                    enableScroll={true}
                  />
                </div>
              </TabsContent>

              {/* Win/Loss/Expectation Tab - Full implementation with 5 charts */}
              <TabsContent value="win-loss" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Win/Loss Ratio Chart */}
                  <Card className="bg-surface border-default">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-primary">WIN/LOSS RATIO</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {winLossRatio.totalTrades > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Wins', value: winLossRatio.wins, percentage: winLossRatio.winRate, color: 'var(--theme-green)' },
                                { name: 'Losses', value: winLossRatio.losses, percentage: winLossRatio.lossRate, color: 'var(--theme-red)' },
                                { name: 'Scratches', value: winLossRatio.scratches, percentage: winLossRatio.scratchRate, color: 'var(--theme-secondary-text)' }
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {[
                                { name: 'Wins', value: winLossRatio.wins, percentage: winLossRatio.winRate, color: 'var(--theme-green)' },
                                { name: 'Losses', value: winLossRatio.losses, percentage: winLossRatio.lossRate, color: 'var(--theme-red)' },
                                { name: 'Scratches', value: winLossRatio.scratches, percentage: winLossRatio.scratchRate, color: 'var(--theme-secondary-text)' }
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: { payload?: { percentage: number } }) => [
                                `${value} (${props.payload?.percentage?.toFixed(1) || '0.0'}%)`,
                                name
                              ]}
                              contentStyle={{ backgroundColor: 'var(--theme-surface)', border: '1px solid var(--theme-default)' }}
                              labelStyle={{ color: 'var(--theme-chart-tooltip-text)' }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              formatter={(value, entry: { payload?: { value?: number; percentage?: number } }) => `${value}: ${entry.payload?.value || 0} (${entry.payload?.percentage?.toFixed(1) || '0.0'}%)`}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted">
                          No data available for the selected period
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Win/Loss P&L Comparison Chart */}
                  <Card className="bg-surface border-default">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-primary">WIN/LOSS P&L COMPARISON</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TradeDistributionChart
                        data={[
                          { date: 'Avg Win', value: winLossPnlComparison.avgWin },
                          { date: 'Avg Loss', value: -winLossPnlComparison.avgLoss },
                          { date: 'Largest Win', value: winLossPnlComparison.largestWin },
                          { date: 'Largest Loss', value: -winLossPnlComparison.largestLoss }
                        ]}
                        title=""
                        height={300}
                        chartType="currency"
                        conditionalColors={true}
                        showGrid={true}
                        showTooltip={true}
                        showReferenceLine={true}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Trade Expectation Chart */}
                  <Card className="bg-surface border-default">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-primary">TRADE EXPECTATION</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div style={{ height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {/* Bar container */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                          <span style={{ 
                            marginRight: '15px', 
                            fontSize: '12px', 
                            color: 'var(--theme-primary-text)',
                            minWidth: '70px'
                          }}>
                            Expectation
                          </span>
                          <div style={{ 
                            flex: 1,
                            height: '80px',
                            color: 'var(--theme-primary-text)',
                            position: 'relative'
                          }}>
                            {/* The actual bar positioned based on value */}
                            <div 
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                height: '100%',
                                backgroundColor: tradeExpectation.expectation >= 0 ? 'var(--theme-green)' : 'var(--theme-red)',
                                // Calculate position and width based on dynamic scale
                                left: tradeExpectation.expectation >= 0 
                                  ? `${((-expectationScale.min) / expectationScale.range) * 100}%`
                                  : `${((tradeExpectation.expectation - expectationScale.min) / expectationScale.range) * 100}%`,
                                width: `${(Math.abs(tradeExpectation.expectation) / expectationScale.range) * 100}%`,
                                borderRadius: '2px',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                              }}
                              title={`Expectation: $${tradeExpectation.expectation.toFixed(2)}`}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              {/* Tooltip on hover */}
                              <div style={{
                                position: 'absolute',
                                top: '-40px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: 'var(--theme-surface)',
                                border: '1px solid var(--theme-default)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--theme-primary-text)',
                                whiteSpace: 'nowrap',
                                opacity: 0,
                                pointerEvents: 'none',
                                transition: 'opacity 0.2s'
                              }}
                              className="expectation-tooltip">
                                Expectation: ${tradeExpectation.expectation.toFixed(2)}
                              </div>
                            </div>
                            {/* Zero line indicator */}
                            <div style={{
                              position: 'absolute',
                              left: `${((-expectationScale.min) / expectationScale.range) * 100}%`,
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              backgroundColor: 'var(--theme-default)',
                              zIndex: 1
                            }}></div>
                            {/* Add CSS for hover effect */}
                            <style jsx>{`
                              div:hover .expectation-tooltip {
                                opacity: 1 !important;
                              }
                            `}</style>
                          </div>
                        </div>
                        {/* X-axis labels */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginLeft: '85px',
                          fontSize: '11px',
                          color: 'var(--theme-primary-text)'
                        }}>
                          {expectationScale.ticks.map((tick, index) => (
                            <span key={index}>
                              {tick >= 0 ? '$' + tick.toFixed(tick % 1 === 0 ? 0 : 1) : '-$' + Math.abs(tick).toFixed(tick % 1 === 0 ? 0 : 1)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Cumulative P&L Chart */}
                  <Card className="bg-surface border-default">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-primary">CUMULATIVE P&L</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EquityChart 
                        data={cumulativePnlData}
                        title=""
                        height={300}
                        useConditionalColors={true}
                      />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Cumulative Drawdown Chart - Full Width */}
                <Card className="bg-surface border-default">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-primary">CUMULATIVE DRAWDOWN</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EquityChart 
                      data={cumulativeDrawdownData.map(d => ({ 
                        date: d.date, 
                        value: d.drawdown 
                      }))}
                      title=""
                      height={300}
                      useConditionalColors={true}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Price/Volume Tab - Enhanced with 4 charts */}
              <TabsContent value="price-volume" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Trade Distribution by Price */}
                  <ChartContainer
                    title="TRADE DISTRIBUTION BY PRICE"
                    data={priceData.distribution}
                    chartType="distribution"
                    valueType="shares"
                    height={300}
                    minWidth={400}
                  />
                  
                  {/* Performance by Price */}
                  <ChartContainer
                    title="PERFORMANCE BY PRICE"
                    data={priceData.performance}
                    chartType="performance"
                    valueType="currency"
                    height={300}
                    minWidth={400}
                  />
                  
                  {/* Trade Distribution by Volume Traded */}
                  <ChartContainer
                    title="TRADE DISTRIBUTION BY VOLUME TRADED"
                    data={volumeData.distribution}
                    chartType="distribution"
                    valueType="shares"
                    height={300}
                    minWidth={400}
                  />
                  
                  {/* Performance by Volume Traded */}
                  <ChartContainer
                    title="PERFORMANCE BY VOLUME TRADED"
                    data={volumeData.performance}
                    chartType="performance"
                    valueType="currency"
                    height={300}
                    minWidth={400}
                  />
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
          </TabsContent>

          {/* Win vs Loss Days Tab */}
          <TabsContent value="win-vs-loss" className="space-y-6">
            <WinVsLossReport trades={trades} loading={detailedLoading} error={detailedError} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}