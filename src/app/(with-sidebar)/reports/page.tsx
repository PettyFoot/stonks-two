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
import DistributionCharts from '@/components/charts/DistributionCharts';
import { mockGapPerformance, mockVolumePerformance, mockMonthlyPerformance, mockSymbolPerformance } from '@/data/mockData';
import { useReportsData } from '@/hooks/useReportsData';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';

export default function Reports() {
  const [dateRange, setDateRange] = useState('30 Days');
  const { filters } = useGlobalFilters();
  const { dailyPnl, averageDailyPnl, averageDailyVolume, cumulativePnl, winPercentage, totalVolume, daysDiff, loading, error } = useReportsData();

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

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">View mode</label>
              <Select defaultValue="$ Value">
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
              <Select defaultValue="Aggregate P&L">
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

        {/* Tabs for different report sections */}
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
            
            {/* Four chart grid */}
            {!loading && !error && (
              <div className="grid grid-cols-2 gap-6">
                {/* Daily P&L Distribution Chart - Now showing average */}
                <CustomBarChart 
                  data={averagePnlData}
                  title={`GROSS DAILY P&L (${filters.timeRange.label})`}
                  height={300}
                  dataKey="value"
                  chartType="currency"
                  useConditionalColors={true}
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

          <TabsContent value="detailed" className="space-y-6">
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

          <TabsContent value="win-vs-loss" className="space-y-6">
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
                      <span className="text-[#16A34A] font-semibold">50.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Win</span>
                      <span className="text-[#16A34A] font-semibold">$53.40</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Loss</span>
                      <span className="text-[#DC2626] font-semibold">-$39.58</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Factor</span>
                      <span className="font-semibold">1.35</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
            <DistributionCharts 
              data={mockMonthlyPerformance}
              title="Performance By Month Of Year"
            />
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
      </div>
    </div>
  );
}