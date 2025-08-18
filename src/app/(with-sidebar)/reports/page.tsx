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
import { mockGapPerformance, mockVolumePerformance, mockMonthlyPerformance, mockSymbolPerformance } from '@/data/mockData';
import { useReportsData } from '@/hooks/useReportsData';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';

// New enhanced components
import StatsSection from '@/components/reports/StatsSection';
import ChartContainer from '@/components/reports/ChartContainer';
import { useDetailedReportsData } from '@/hooks/useDetailedReportsData';
import { 
  aggregateByDayOfWeek, 
  aggregateByHourOfDay, 
  aggregateByMonthOfYear,
  aggregateByDuration,
  aggregateByIntradayDuration 
} from '@/lib/reportCalculations';

export default function Reports() {
  const [dateRange, setDateRange] = useState('30 Days');
  const [pnlType, setPnlType] = useState('Gross');
  const [viewMode, setViewMode] = useState('$ Value');
  const [reportType, setReportType] = useState('Aggregate P&L');
  const { filters } = useGlobalFilters();
  
  // Original data hook for existing charts
  const { dailyPnl, averageDailyPnl, averageDailyVolume, cumulativePnl, winPercentage, totalVolume, daysDiff, loading, error } = useReportsData();
  
  // New enhanced data hook for statistics and new charts
  const { stats, trades, loading: detailedLoading, error: detailedError } = useDetailedReportsData();

  // Transform daily P&L data for the MonthTradeDistributionChart
  const dailyPnlChartData = useMemo(() => {
    return dailyPnl.map(day => ({
      date: day.date,
      pnl: day.pnl
    }));
  }, [dailyPnl]);

  // Calculate average daily P&L for Gross Daily P&L chart
  const averagePnlData = useMemo(() => {
    if (averageDailyPnl === 0) return [];
    return [{
      date: 'Average',
      value: averageDailyPnl
    }];
  }, [averageDailyPnl]);

  // Calculate average daily volume for chart display
  const dailyVolumeData = useMemo(() => {
    if (averageDailyVolume === 0) return [];
    return [{
      date: 'Average',
      value: averageDailyVolume
    }];
  }, [averageDailyVolume]);

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
  const durationData = useMemo(() => aggregateByDuration(trades), [trades]);
  const intradayDurationData = useMemo(() => aggregateByIntradayDuration(trades), [trades]);

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

        {/* NEW: Enhanced Statistics Section - 22 Trading Metrics */}
        {!detailedLoading && !detailedError && (
          <StatsSection stats={stats} />
        )}

        {/* Original Tabs with Enhanced Content */}
        <Tabs defaultValue="overview" className="space-y-6">
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
                  title={`GROSS DAILY P&L (${filters.timeRange.label})`}
                  height={300}
                />
                
                {/* Cumulative P&L Chart */}
                <EquityChart 
                  data={cumulativePnl}
                  title={`GROSS CUMULATIVE P&L (${filters.timeRange.label})`}
                  height={300}
                  useConditionalColors={true}
                />
                
                {/* Daily Volume Chart */}
                <CustomBarChart 
                  data={dailyVolumeData}
                  title={`DAILY VOLUME (${filters.timeRange.label})`}
                  height={300}
                  dataKey="value"
                  chartType="shares"
                  useConditionalColors={true}
                />
                
                {/* Win Percentage Chart */}
                <CustomBarChart 
                  data={winPercentageData}
                  title={`WIN % (${filters.timeRange.label})`}
                  height={300}
                  dataKey="value"
                  chartType="percentage"
                  useConditionalColors={true}
                />
              </div>
            )}
          </TabsContent>

          {/* Detailed Tab - Enhanced with Days/Times Analysis */}
          <TabsContent value="detailed" className="space-y-6">
            {/* NEW: Days/Times Analysis Charts */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-primary mb-4">Days & Times Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trade Distribution by Day of Week */}
                <ChartContainer
                  title="TRADE DISTRIBUTION BY DAY OF WEEK"
                  data={dayOfWeekData.distribution}
                  chartType="distribution"
                  valueType="shares"
                  height={300}
                />
                
                {/* Performance by Day of Week */}
                <ChartContainer
                  title="PERFORMANCE BY DAY OF WEEK"
                  data={dayOfWeekData.performance}
                  chartType="performance"
                  valueType="currency"
                  height={300}
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
            </div>

            {/* Original Detailed Charts */}
            <div className="grid grid-cols-2 gap-6">
              <DistributionCharts 
                data={mockGapPerformance}
                title="Performance By Instrument Opening Gap"
              />
              
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Tag Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-center justify-center text-muted">
                    <span>Chart visualization here</span>
                  </div>
                </CardContent>
              </Card>

              <DistributionCharts 
                data={mockVolumePerformance}
                title="Performance By Instrument Volume"
              />
              
              <DistributionCharts 
                data={mockSymbolPerformance}
                title="Performance By Symbol At Entry"
              />
            </div>
          </TabsContent>

          {/* Win vs Loss Days Tab - Enhanced with Win/Loss/Expectation Charts */}
          <TabsContent value="win-vs-loss" className="space-y-6">
            {/* NEW: Enhanced Win/Loss Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
            </div>

            {/* Original Win vs Loss Content */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Win vs Loss Analysis</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <div className="flex items-center justify-center h-full text-muted">
                    Win vs Loss analysis charts
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Win Rate</span>
                      <span className="text-[#16A34A] font-semibold">{((stats?.winningTrades || 0) / (stats?.totalTrades || 1) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Win</span>
                      <span className="text-[#16A34A] font-semibold">${stats?.avgWinningTrade?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Loss</span>
                      <span className="text-[#DC2626] font-semibold">${stats?.avgLosingTrade?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Factor</span>
                      <span className="font-semibold">{stats?.profitFactor?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Consecutive Wins</span>
                      <span className="font-semibold">{stats?.maxConsecutiveWins || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Consecutive Losses</span>
                      <span className="font-semibold">{stats?.maxConsecutiveLosses || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Drawdown Tab - Original Placeholder */}
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

          {/* Compare Tab - Original Placeholder */}
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

          {/* Tag Breakdown Tab - Original Content */}
          <TabsContent value="tag-breakdown" className="space-y-6">
            <DistributionCharts 
              data={mockMonthlyPerformance}
              title="Performance By Month Of Year"
            />
            
            {/* NEW: Intraday Duration Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer
                title="TRADE DISTRIBUTION BY INTRADAY DURATION"
                data={intradayDurationData.distribution}
                chartType="distribution"
                valueType="shares"
                height={300}
                minWidth={450}
                enableScroll={true}
              />
              
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

          {/* Advanced Tab - Enhanced with New Metrics */}
          <TabsContent value="advanced" className="space-y-6">
            {/* NEW: Advanced Statistics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Trade P&L Std Deviation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${stats?.tradePnlStdDev?.toFixed(2) || '0.00'}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Profit Factor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {stats?.profitFactor?.toFixed(2) || '0.00'}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Total Commissions & Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#DC2626]">
                    ${((stats?.totalCommissions || 0) + (stats?.totalFees || 0)).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Original MAE/MFE Cards */}
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