'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomBarChart from '@/components/charts/BarChart';
import ConditionalBarChart from '@/components/charts/ConditionalBarChart';
import StatisticsTable from '@/components/charts/StatisticsTable';
import WinLossStatsTable from '@/components/charts/WinLossStatsTable';
import AnalyticsTabsSection from '@/components/analytics/AnalyticsTabsSection';
import { ReportsFilterOptions } from '@/types';
import { useFilterContext } from '@/contexts/GlobalFilterContext';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';

function ReportsContent() {
  const { state, updateFilters, setStandardTimeframe, getEffectiveTimeframe } = useFilterContext();

  // Convert filter context state to reports filter format
  const reportsFilters: ReportsFilterOptions = {
    predefinedTimeframe: state.filters.predefinedTimeframe,
    customTimeRange: !!state.filters.dateFrom || !!state.filters.dateTo,
    symbols: state.filters.symbols,
    tags: state.filters.tags,
    side: state.filters.side,
    dateFrom: state.filters.dateFrom,
    dateTo: state.filters.dateTo,
  };

  // Fetch real analytics data
  const { data: analyticsData, loading, error, errorType, refetch, retryCount } = useAnalyticsData(state.standardTimeframe, reportsFilters);

  const handleFiltersChange = (newFilters: ReportsFilterOptions) => {
    updateFilters({
      predefinedTimeframe: newFilters.predefinedTimeframe,
      customTimeRange: newFilters.customTimeRange,
      symbols: newFilters.symbols,
      tags: newFilters.tags,
      side: newFilters.side,
      dateFrom: newFilters.dateFrom,
      dateTo: newFilters.dateTo,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Reports" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        filters={reportsFilters}
        onFiltersChange={handleFiltersChange}
        showTimeframes={true}
        showAdvanced={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Simplified Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">P&L Type</label>
              <Select defaultValue="Gross">
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gross">Gross</SelectItem>
                  <SelectItem value="Net">Net</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Time Range Selector */}
            <div className="flex rounded-lg border border-default bg-surface">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-l-lg rounded-r-none border-r h-8 ${state.standardTimeframe === '30d' ? 'bg-muted/10' : ''}`}
                onClick={() => setStandardTimeframe('30d')}
              >
                30 Days
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-none border-r h-8 ${state.standardTimeframe === '60d' ? 'bg-muted/10' : ''}`}
                onClick={() => setStandardTimeframe('60d')}
              >
                60 Days
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-r-lg rounded-l-none h-8 ${state.standardTimeframe === '90d' ? 'bg-muted/10' : ''}`}
                onClick={() => setStandardTimeframe('90d')}
              >
                90 Days
              </Button>
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <div className="text-red-500 text-lg mb-2">
                {errorType === 'network' ? '🌐' : errorType === 'validation' ? '⚠️' : '❌'} 
              </div>
              <p className="text-red-500 font-medium mb-2">Error loading analytics data</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              {errorType === 'network' && retryCount < 3 && (
                <Button 
                  onClick={refetch} 
                  variant="outline" 
                  size="sm"
                  className="mr-2"
                >
                  Retry ({retryCount}/3)
                </Button>
              )}
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        )}

        {/* Tabs for different report sections */}
        {analyticsData && !loading && !error && (
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

            <TabsContent value="overview" className="space-y-6">
              {/* Four chart grid with real data */}
              <div className="grid grid-cols-2 gap-6">
                <ConditionalBarChart 
                  data={analyticsData.overview.dailyPnl}
                  title={`GROSS DAILY P&L (AVG) (${getEffectiveTimeframe().toUpperCase()})`}
                  height={300}
                />
                
                <ConditionalBarChart 
                  data={analyticsData.overview.cumulativePnl}
                  title={`GROSS CUMULATIVE P&L (${getEffectiveTimeframe().toUpperCase()})`}
                  height={300}
                  valueFormatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                
                <CustomBarChart 
                  data={analyticsData.overview.dailyVolume}
                  title={`DAILY VOLUME (${getEffectiveTimeframe().toUpperCase()})`}
                  height={300}
                  dataKey="value"
                  chartType="normalizedVolume"
                />
                
                <CustomBarChart 
                  data={analyticsData.overview.winPercentage}
                  title={`WIN % (${getEffectiveTimeframe().toUpperCase()})`}
                  height={300}
                  dataKey="value"
                  chartType="percentage"
                />
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              {/* Statistics Table at the top */}
              <StatisticsTable metrics={analyticsData.statistics} title="Stats" />
              
              {/* Analytics Tabs Section */}
              <AnalyticsTabsSection data={analyticsData} context="detailed" />
              
              {/* Chart sections */}
              <div className="grid grid-cols-2 gap-6">
                {/* Trade Distribution by Day of Week */}
                <CustomBarChart 
                  data={analyticsData.distribution.byDayOfWeek}
                  title="TRADE DISTRIBUTION BY DAY OF WEEK"
                  height={300}
                  dataKey="count"
                  chartType="shares"
                />
                
                {/* Performance by Day of Week */}
                <ConditionalBarChart 
                  data={analyticsData.performance.byDayOfWeek}
                  title="PERFORMANCE BY DAY OF WEEK"
                  height={300}
                />
                
                {/* Trade Distribution by Hour of Day */}
                <CustomBarChart 
                  data={analyticsData.distribution.byHourOfDay}
                  title="TRADE DISTRIBUTION BY HOUR OF DAY"
                  height={300}
                  dataKey="count"
                  chartType="shares"
                />
                
                {/* Performance by Hour of Day */}
                <ConditionalBarChart 
                  data={analyticsData.performance.byHourOfDay}
                  title="PERFORMANCE BY HOUR OF DAY"
                  height={300}
                />
                
                {/* Trade Distribution by Month of Year */}
                <CustomBarChart 
                  data={analyticsData.distribution.byMonth}
                  title="TRADE DISTRIBUTION BY MONTH OF YEAR"
                  height={300}
                  dataKey="count"
                  chartType="shares"
                />
                
                {/* Performance by Month of Year */}
                <ConditionalBarChart 
                  data={analyticsData.performance.byMonth}
                  title="PERFORMANCE BY MONTH OF YEAR"
                  height={300}
                />
                
                {/* Trade Distribution by Duration */}
                <CustomBarChart 
                  data={analyticsData.distribution.byDuration}
                  title="TRADE DISTRIBUTION BY DURATION"
                  height={300}
                  dataKey="count"
                  chartType="shares"
                />
                
                {/* Performance by Duration */}
                <ConditionalBarChart 
                  data={analyticsData.performance.byDuration}
                  title="PERFORMANCE BY DURATION"
                  height={300}
                />
              </div>
            </TabsContent>

          <TabsContent value="win-vs-loss" className="space-y-6">
            <WinLossStatsTable 
              winningDaysMetrics={analyticsData.winLossStats.winningDays}
              losingDaysMetrics={analyticsData.winLossStats.losingDays}
            />
            
            {/* Analytics Tabs Section */}
            <AnalyticsTabsSection data={analyticsData} context="win-loss-days" />
          </TabsContent>

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

          <TabsContent value="tag-breakdown" className="space-y-6">
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Tag Breakdown Analysis</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <div className="flex items-center justify-center h-full text-muted">
                  Tag breakdown charts will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  return <ReportsContent />;
}