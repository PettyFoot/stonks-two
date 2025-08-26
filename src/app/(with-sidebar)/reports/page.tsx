'use client';

import React, { useState, useMemo } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EquityChart from '@/components/charts/EquityChart';
import CustomBarChart from '@/components/charts/BarChart';
import MonthTradeDistributionChart from '@/components/charts/MonthTradeDistributionChart';
import DistributionCharts from '@/components/charts/DistributionCharts';
import { mockMonthlyPerformance } from '@/data/mockData';
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
  const [dateRange, setDateRange] = useState('30 Days');
  const [pnlType, setPnlType] = useState('Gross');
  const [viewMode, setViewMode] = useState('$ Value');
  const [reportType, setReportType] = useState('Aggregate P&L');
  const { } = useGlobalFilters();
  
  // Original data hook for existing charts
  const { dailyPnl, averageDailyVolume, averageDailyVolumeOnTradingDays, cumulativePnl, loading, error } = useReportsData();
  
  // New enhanced data hook for statistics and new charts
  const { stats, trades, loading: detailedLoading, error: detailedError } = useDetailedReportsData();

  // Transform daily P&L data for the MonthTradeDistributionChart
  const dailyPnlChartData = useMemo(() => {
    return dailyPnl.map(day => ({
      date: day.date,
      pnl: day.pnl
    }));
  }, [dailyPnl]);


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

  // Transform win rate data for chart
  const winPercentageData = useMemo(() => {
    return dailyPnl.map(day => ({
      date: day.date,
      value: day.winRate
    }));
  }, [dailyPnl]);

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
  const cumulativePnlData = useMemo(() => calculateCumulativePnl(trades), [trades]);
  const cumulativeDrawdownData = useMemo(() => calculateCumulativeDrawdown(trades), [trades]);

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Reports" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
        showTimeRangeTabs={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Report Type Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
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

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">View mode</label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$ Value">$ Value</SelectItem>
                  <SelectItem value="Percentage">%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">Report type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aggregate P&L">Aggregate P&L</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Type Selection */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-lg border border-default bg-surface">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-l-lg rounded-r-none border-r h-8 ${dateRange === 'Recent' ? 'bg-muted/10' : ''}`}
                  onClick={() => setDateRange('Recent')}
                >
                  Recent
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-none border-r h-8 ${dateRange === 'Year/Month/Day' ? 'bg-muted/10' : ''}`}
                  onClick={() => setDateRange('Year/Month/Day')}
                >
                  Year/Month/Day
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-r-lg rounded-l-none h-8 ${dateRange === 'Calendar' ? 'bg-muted/10' : ''}`}
                  onClick={() => setDateRange('Calendar')}
                >
                  Calendar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* FIRST TAB SYSTEM: Original 7 Tabs (Overview, Detailed, etc.) */}
        <Tabs defaultValue="overview" className="space-y-6 mb-8">
          <TabsList className="grid grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="win-vs-loss">Win vs Loss Days</TabsTrigger>
            <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="tag-breakdown">Tag Breakdown</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
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
              <div className="grid grid-cols-2 gap-6">
                {/* Daily P&L Distribution Chart */}
                <MonthTradeDistributionChart 
                  data={dailyPnlChartData}
                  title="GROSS DAILY P&L"
                  height={300}
                />
                
                {/* Cumulative P&L Chart */}
                <EquityChart 
                  data={cumulativePnl}
                  title="GROSS CUMULATIVE P&L"
                  height={300}
                  useConditionalColors={true}
                />
                
                {/* Daily Volume Chart */}
                <CustomBarChart 
                  data={dailyVolumeData}
                  title="DAILY VOLUME"
                  height={300}
                  dataKey="value"
                  chartType="shares"
                  useConditionalColors={true}
                />
                
                {/* Win Percentage Chart */}
                <CustomBarChart 
                  data={winPercentageData}
                  title="WIN %"
                  height={300}
                  dataKey="value"
                  chartType="percentage"
                  useConditionalColors={true}
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
                <TabsList className="grid grid-cols-4 w-full max-w-2xl">
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
                                { name: 'Wins', value: winLossRatio.wins, percentage: winLossRatio.winRate, color: '#16A34A' },
                                { name: 'Losses', value: winLossRatio.losses, percentage: winLossRatio.lossRate, color: '#DC2626' },
                                { name: 'Scratches', value: winLossRatio.scratches, percentage: winLossRatio.scratchRate, color: '#6B7280' }
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {[
                                { name: 'Wins', value: winLossRatio.wins, percentage: winLossRatio.winRate, color: '#16A34A' },
                                { name: 'Losses', value: winLossRatio.losses, percentage: winLossRatio.lossRate, color: '#DC2626' },
                                { name: 'Scratches', value: winLossRatio.scratches, percentage: winLossRatio.scratchRate, color: '#6B7280' }
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: { payload?: { percentage: number } }) => [
                                `${value} (${props.payload?.percentage?.toFixed(1) || '0.0'}%)`,
                                name
                              ]}
                              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                              labelStyle={{ color: '#E5E7EB' }}
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
                      <CustomBarChart
                        data={[
                          { date: 'Avg Win', value: winLossPnlComparison.avgWin },
                          { date: 'Avg Loss', value: -winLossPnlComparison.avgLoss },
                          { date: 'Largest Win', value: winLossPnlComparison.largestWin },
                          { date: 'Largest Loss', value: -winLossPnlComparison.largestLoss }
                        ]}
                        title=""
                        height={300}
                        chartType="currency"
                        useConditionalColors={true}
                        showGrid={true}
                        showTooltip={true}
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
                            color: '#9CA3AF',
                            minWidth: '70px'
                          }}>
                            Expectation
                          </span>
                          <div style={{ 
                            flex: 1,
                            height: '80px',
                            position: 'relative'
                          }}>
                            {/* The actual bar positioned based on value */}
                            <div 
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                height: '100%',
                                backgroundColor: tradeExpectation.expectation >= 0 ? '#16A34A' : '#DC2626',
                                // Scale: -3 to 5 = 8 units total, 0 is at 3/8 = 37.5% from left
                                left: tradeExpectation.expectation >= 0 ? '37.5%' : `${37.5 + (tradeExpectation.expectation / 8 * 100)}%`,
                                width: `${Math.abs(tradeExpectation.expectation) / 8 * 100}%`,
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
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: '#E5E7EB',
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
                              left: '37.5%',
                              top: 0,
                              bottom: 0,
                              width: '1px',
                              backgroundColor: '#4B5563',
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
                          color: '#6B7280'
                        }}>
                          <span>-$3</span>
                          <span>-$2</span>
                          <span>-$1</span>
                          <span>$0</span>
                          <span>$1</span>
                          <span>$2</span>
                          <span>$3</span>
                          <span>$4</span>
                          <span>$5</span>
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
            <WinVsLossReport />
          </TabsContent>

          {/* Drawdown Tab */}
          <TabsContent value="drawdown" className="space-y-6">
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Drawdown Analysis</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <div className="flex items-center justify-center h-full text-muted">
                  Drawdown analysis will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-6">
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <div className="flex items-center justify-center h-full text-muted">
                  Comparison charts will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tag Breakdown Tab */}
          <TabsContent value="tag-breakdown" className="space-y-6">
            <DistributionCharts 
              data={mockMonthlyPerformance}
              title="Performance By Month Of Year"
            />
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Average Position MAE</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-[#DC2626] mb-2">
                        -$11.42
                      </div>
                      <div className="text-sm text-muted">Maximum Adverse Excursion</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Average Position MFE</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-[#16A34A] mb-2">
                        $14.46
                      </div>
                      <div className="text-sm text-muted">Maximum Favorable Excursion</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}