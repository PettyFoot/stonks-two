'use client';

import React, { useEffect, useMemo } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import KPICards from '@/components/KPICards';
import EquityChart from '@/components/charts/EquityChart';
import CustomPieChart from '@/components/charts/PieChart';
import DistributionCharts, { GaugeChart } from '@/components/charts/DistributionCharts';
import HorizontalBarChart, { formatDuration, formatCurrency } from '@/components/charts/HorizontalBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';


export default function Dashboard() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const { data: analytics, loading, error } = useDashboardData(false);
  const { filters, toFilterOptions } = useGlobalFilters();

  // Format the filter date range for display
  const getDateRangeDisplay = useMemo(() => {
    const filterOptions = toFilterOptions();
    if (filterOptions.dateFrom && filterOptions.dateTo) {
      const fromDate = new Date(filterOptions.dateFrom);
      const toDate = new Date(filterOptions.dateTo);
      const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      return `${fromDate.toLocaleDateString('en-US', formatOptions)} - ${toDate.toLocaleDateString('en-US', formatOptions)}`;
    }
    // Default to showing the time range label if no custom dates
    return filters.timeRange?.label || '30 Days';
  }, [filters, toFilterOptions]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2563EB] mx-auto mb-4"></div>
      </div>
    );
  }

  if (!user) return null;

  if (error || !analytics) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Dashboard" showTimeRangeFilters={false} />
        <FilterPanel showTimeRangeTabs={true} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            {error ? (
              // Show error message
              <div className="mb-6">
                <FileText className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                >
                  Retry
                </Button>
              </div>
            ) : (
              // Show no data message
              <div className="mb-6">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trading Data Found</h3>
                <p className="text-gray-600 mb-6">
                  No trades match the current filter settings. Try adjusting your filters or import new trades.
                </p>
                <div className="space-y-3">
                  <Link href="/import">
                    <Button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Trades
                    </Button>
                  </Link>
                  <Link href="/new-trade">
                    <Button variant="outline" className="w-full">
                      Add Manual Trade
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { kpiData: metrics, cumulativePnl: performanceData } = analytics;

  // Prepare pie chart data for winning vs losing trades
  const winLossData = [
    { name: 'Winning', value: metrics.winningTradesCount, percentage: metrics.winRate, color: '#16A34A' },
    { name: 'Losing', value: metrics.losingTradesCount, percentage: 100 - metrics.winRate, color: '#DC2626' }
  ];

  // Performance by day of week data
  const dayOfWeekData = metrics.performanceByDayOfWeek?.map(day => ({
    range: day.day.substring(0, 3), // Short day name
    value: day.pnl,
    percentage: day.winRate,
    count: day.trades
  })) || [];

  // Performance by month of year data  
  const monthOfYearData = metrics.performanceByMonthOfYear?.map(month => ({
    range: month.month,
    value: month.pnl,
    percentage: month.winRate,
    count: month.trades
  })) || [];

  // Hold time data for bar chart
  const holdTimeData = [
    { 
      label: 'Winning', 
      value: metrics.avgHoldTimeWinning || 0, 
      color: '#16A34A',
      displayValue: formatDuration(metrics.avgHoldTimeWinning || 0)
    },
    { 
      label: 'Losing', 
      value: metrics.avgHoldTimeLosing || 0, 
      color: '#DC2626',
      displayValue: formatDuration(metrics.avgHoldTimeLosing || 0)
    }
  ];

  // Average win/loss data for bar chart
  const avgWinLossData = [
    { 
      label: 'Winning', 
      value: metrics.avgWinningTrade || 0, 
      color: '#16A34A',
      displayValue: formatCurrency(metrics.avgWinningTrade || 0)
    },
    { 
      label: 'Losing', 
      value: Math.abs(metrics.avgLosingTrade || 0), 
      color: '#DC2626',
      displayValue: formatCurrency(metrics.avgLosingTrade || 0)
    }
  ];

  // Performance by duration data for bar chart
  const durationData = metrics.performanceByDuration?.map(item => ({
    label: item.category,
    value: item.pnl,
    color: item.pnl >= 0 ? '#16A34A' : '#DC2626',
    displayValue: formatCurrency(item.pnl)
  })) || [];

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Dashboard" 
        subtitle={getDateRangeDisplay}
        showEditLayout={true}
        showTimeRangeFilters={false}
      />
      
      <FilterPanel showTimeRangeTabs={true} />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Daily Calendar Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-primary mb-4">
            {getDateRangeDisplay}
          </h2>
          <KPICards days={analytics.dayData || []} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Cumulative P&L - Large Chart */}
          <div className="col-span-8">
            <EquityChart 
              data={performanceData}
              title="Cumulative P&L"
              height={350}
            />
          </div>

          {/* Winning vs Losing Trades - Pie Chart */}
          <div className="col-span-4">
            <CustomPieChart 
              data={winLossData}
              title="Winning vs Losing Trades"
              height={200}
            />
          </div>

          {/* Win % Chart */}
          <div className="col-span-4">
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Win %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#16A34A] mb-2">
                      {metrics.winRate.toFixed(1)}%
                    </div>
                    <div className="w-32 h-32 mx-auto bg-[#16A34A] rounded-full opacity-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hold Time Winning Trades vs Losing Trades */}
          <div className="col-span-4">
            <HorizontalBarChart
              title="Hold Time Winning vs Losing Trades"
              data={holdTimeData}
              height={120}
            />
          </div>

          {/* Average Winning Trade vs Losing Trade */}
          <div className="col-span-4">
            <HorizontalBarChart
              title="Average Winning vs Losing Trade"
              data={avgWinLossData}
              height={120}
            />
          </div>

          {/* Performance By Day Of Week */}
          <div className="col-span-4">
            <DistributionCharts 
              data={dayOfWeekData}
              title="Performance By Day Of Week"
            />
          </div>

          {/* Performance By Month Of Year */}
          <div className="col-span-4">
            <DistributionCharts 
              data={monthOfYearData}
              title="Performance By Month Of Year"
            />
          </div>

          {/* Largest Gain vs Largest Loss */}
          <div className="col-span-4">
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Largest Gain vs Largest Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Largest Gain</span>
                    <span className="text-lg font-bold text-[#16A34A]">
                      {formatCurrency(metrics.largestGain || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Largest Loss</span>
                    <span className="text-lg font-bold text-[#DC2626]">
                      {formatCurrency(metrics.largestLoss || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance By Duration */}
          <div className="col-span-4">
            <HorizontalBarChart
              title="Performance By Duration"
              data={durationData}
              height={120}
            />
          </div>

          {/* Max Consecutive Wins/Losses */}
          <div className="col-span-4">
            <div className="grid grid-rows-2 gap-4 h-full">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Max Consecutive Wins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#16A34A]">
                      {metrics.maxConsecutiveWins}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Max Consecutive Losses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#DC2626]">
                      {metrics.maxConsecutiveLosses}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}