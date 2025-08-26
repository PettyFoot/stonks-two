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
import { CHART_HEIGHTS } from '@/constants/chartHeights';


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

  // Performance by day of week data - ensure all 7 days are included
  const allDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayOfWeekData = allDaysOfWeek.map(dayName => {
    const existingData = metrics.performanceByDayOfWeek?.find(day => day.day === dayName);
    return {
      range: dayName.substring(0, 3), // Short day name
      value: existingData?.pnl || 0,
      percentage: existingData?.winRate || 0,
      count: existingData?.trades || 0
    };
  });

  // Performance by month of year data - ensure all 12 months are included
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthOfYearData = allMonths.map(monthName => {
    const existingData = metrics.performanceByMonthOfYear?.find(month => month.month === monthName);
    return {
      range: monthName,
      value: existingData?.pnl || 0,
      percentage: existingData?.winRate || 0,
      count: existingData?.trades || 0
    };
  });

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
        <div className="grid grid-cols-6 gap-6">
          {/* Row 1: Main P&L Chart and Key Metrics */}
          {/* Cumulative P&L - Reduced Width */}
          <div className="col-span-4 row-span-2">
            <EquityChart 
              data={performanceData}
              title="Cumulative P&L"
              height={CHART_HEIGHTS.LG}
            />
          </div>

          {/* Winning vs Losing Trades - Pie Chart */}
          <div className="col-span-1">
            <CustomPieChart 
              data={winLossData}
              title="Winning vs Losing Trades"
              height={CHART_HEIGHTS.SM}
            />
          </div>

          {/* Win % Chart */}
          <div className="col-span-1">
            <Card className="bg-surface border-default overflow-hidden" style={{ height: CHART_HEIGHTS.SM }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Win %</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center" style={{ height: `calc(100% - 60px)` }}>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#16A34A] mb-2">
                    {metrics.winRate.toFixed(1)}%
                  </div>
                  <div className="w-20 h-20 mx-auto bg-[#16A34A] rounded-full opacity-20"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row - Fill gap under Cumulative P&L */}
          {/* Max Consecutive Wins */}
          <div className="col-span-1">
            <Card className="bg-surface border-default overflow-hidden" style={{ height: CHART_HEIGHTS.SM }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">Max Consecutive Wins</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center" style={{ height: `calc(100% - 60px)` }}>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#16A34A] mb-1">
                    {metrics.maxConsecutiveWins}
                  </div>
                  <div className="text-xs text-muted">Consecutive Wins</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Max Consecutive Losses */}
          <div className="col-span-1">
            <Card className="bg-surface border-default overflow-hidden" style={{ height: CHART_HEIGHTS.SM }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">Max Consecutive Losses</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center" style={{ height: `calc(100% - 60px)` }}>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#DC2626] mb-1">
                    {metrics.maxConsecutiveLosses}
                  </div>
                  <div className="text-xs text-muted">Consecutive Losses</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Horizontal Bar Charts and Metrics */}
          {/* Hold Time Winning Trades vs Losing Trades */}
          <div className="col-span-2">
            <HorizontalBarChart
              title="Hold Time Winning vs Losing Trades"
              data={holdTimeData}
              height={CHART_HEIGHTS.SM}
            />
          </div>

          {/* Average Winning Trade vs Losing Trade */}
          <div className="col-span-2">
            <HorizontalBarChart
              title="Average Winning vs Losing Trade"
              data={avgWinLossData}
              height={CHART_HEIGHTS.SM}
            />
          </div>

          {/* Largest Gain vs Largest Loss */}
          <div className="col-span-2">
            <Card className="bg-surface border-default overflow-hidden" style={{ height: CHART_HEIGHTS.SM }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Largest Gain vs Largest Loss</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-center" style={{ height: `calc(100% - 60px)` }}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Largest Gain</span>
                    <span className="text-xl font-bold text-[#16A34A]">
                      {formatCurrency(metrics.largestGain || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Largest Loss</span>
                    <span className="text-xl font-bold text-[#DC2626]">
                      {formatCurrency(metrics.largestLoss || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance By Duration */}
          <div className="col-span-2">
            <HorizontalBarChart
              title="Performance By Duration"
              data={durationData}
              height={CHART_HEIGHTS.SM}
            />
          </div>

          {/* Placeholder for future metrics - Fill remaining space */}
          <div className="col-span-4">
            <Card className="bg-surface border-default overflow-hidden" style={{ height: CHART_HEIGHTS.SM }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Additional Metrics</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center" style={{ height: `calc(100% - 60px)` }}>
                <div className="text-center text-muted">
                  <div className="text-sm">Space available for additional dashboard metrics</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Performance Distribution Charts - Larger Size */}
          {/* Performance By Day Of Week */}
          <div className="col-span-3">
            <DistributionCharts 
              data={dayOfWeekData}
              title="Performance By Day Of Week"
              height={CHART_HEIGHTS.LG}
            />
          </div>

          {/* Performance By Month Of Year */}
          <div className="col-span-3">
            <DistributionCharts 
              data={monthOfYearData}
              title="Performance By Month Of Year"
              height={CHART_HEIGHTS.LG}
            />
          </div>


          {/* Empty space filler or additional metrics can go here */}
          <div className="col-span-6">
            {/* This space can be used for additional metrics or left empty for balance */}
            <div className="h-full flex items-center justify-center text-muted-foreground">
              {/* Future metrics or charts can go here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}