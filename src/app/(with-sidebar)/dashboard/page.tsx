'use client';

import React, { useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import KPICards from '@/components/KPICards';
import EquityChart from '@/components/charts/EquityChart';
import CustomPieChart from '@/components/charts/PieChart';
import DistributionCharts, { GaugeChart } from '@/components/charts/DistributionCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDashboardData } from '@/hooks/useDashboardData';


export default function Dashboard() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const { data: analytics, loading, error } = useDashboardData(false);

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
            <div className="mb-6">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trading Data Yet</h3>
              <p className="text-gray-600 mb-6">
                Start by importing your trades or manually adding your first trade to see your analytics dashboard.
              </p>
            </div>
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
        </div>
      </div>
    );
  }

  const { kpiData: metrics, cumulativePnl: performanceData } = analytics;

  // Prepare pie chart data for winning vs losing trades
  const totalWinning = metrics.avgWinningTrade * (metrics.totalTrades * metrics.winRate / 100);
  const totalLosing = Math.abs(metrics.avgLosingTrade * (metrics.totalTrades * (100 - metrics.winRate) / 100));
  
  const winLossData = [
    { name: 'Winning', value: totalWinning, percentage: metrics.winRate, color: '#16A34A' },
    { name: 'Losing', value: totalLosing, percentage: 100 - metrics.winRate, color: '#DC2626' }
  ];

  // Performance by day of week data (simplified for now)
  const dayOfWeekData = [
    { range: 'Sun', value: 0, percentage: 0, count: 0 },
    { range: 'Mon', value: 0, percentage: 0, count: 0 },
    { range: 'Tue', value: 0, percentage: 0, count: 0 },
    { range: 'Wed', value: 0, percentage: 0, count: 0 },
    { range: 'Thu', value: 0, percentage: 0, count: 0 },
    { range: 'Fri', value: 0, percentage: 0, count: 0 },
    { range: 'Sat', value: 0, percentage: 0, count: 0 }
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Dashboard" 
        subtitle="Aug 2025"
        showEditLayout={true}
        showTimeRangeFilters={false}
      />
      
      <FilterPanel showTimeRangeTabs={true} />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Daily Calendar Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-primary mb-4">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Hold Time Winning Trades vs Losing Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Half a minute</span>
                    <div className="flex-1 mx-3 h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-[#16A34A] rounded" style={{width: '80%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Less than 20 seconds</span>
                    <div className="flex-1 mx-3 h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-[#DC2626] rounded" style={{width: '60%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Average Winning Trade vs Losing Trade + Largest Gain vs Largest Loss */}
          <div className="col-span-4">
            <div className="grid grid-rows-2 gap-4 h-full">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Average Winning Trade vs Losing Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-[#16A34A]">${metrics.avgWinningTrade.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-[#DC2626]">-${Math.abs(metrics.avgLosingTrade).toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Largest Gain vs Largest Loss</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <GaugeChart 
                      value={metrics.bestDay}
                      max={Math.max(300, metrics.bestDay * 1.2)}
                      title=""
                      height={80}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance By Day Of Week */}
          <div className="col-span-4">
            <DistributionCharts 
              data={dayOfWeekData}
              title="Performance By Day Of Week"
            />
          </div>

          {/* Average MFE vs MAE */}
          <div className="col-span-4">
            <div className="grid grid-rows-2 gap-4 h-full">
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Average MFE vs MAE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <GaugeChart 
                      value={Math.abs(metrics.worstDay)}
                      max={Math.max(20, Math.abs(metrics.worstDay) * 1.2)}
                      title=""
                      height={80}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Performance By Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Intraday</span>
                      <span className="text-[#16A34A]">${metrics.totalPnl.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Multiday</span>
                      <span className="text-muted">$0.00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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