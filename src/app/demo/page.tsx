'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import KPICards from '@/components/KPICards';
import EquityChart from '@/components/charts/EquityChart';
import CustomPieChart from '@/components/charts/PieChart';
import DistributionCharts, { GaugeChart } from '@/components/charts/DistributionCharts';
import { mockDayData, mockCumulativePnl, mockKPIData } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DemoPage() {
  // Prepare pie chart data for winning vs losing trades
  const winLossData = [
    { name: 'Winning', value: mockKPIData.totalPnl * 0.65, percentage: 65, color: 'var(--theme-green)' },
    { name: 'Losing', value: mockKPIData.totalPnl * 0.35, percentage: 35, color: 'var(--theme-red)' }
  ];

  // Performance by day of week data
  const dayOfWeekData = [
    { range: 'Sun', value: 0, percentage: 0, count: 0 },
    { range: 'Mon', value: 3.72, percentage: 100, count: 1 },
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
        subtitle="Aug 2025 - Demo Mode"
        showEditLayout={true}
        showTimeRangeFilters={true}
      />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Daily Calendar Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Aug 2025</h2>
          <KPICards days={mockDayData} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Cumulative P&L - Large Chart */}
          <div className="col-span-8">
            <EquityChart 
              data={mockCumulativePnl}
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
                    <div className="text-4xl font-bold text-[var(--theme-green)] mb-2">
                      {mockKPIData.winRate}%
                    </div>
                    <div className="w-32 h-32 mx-auto bg-[var(--theme-green)] rounded-full opacity-20"></div>
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
                      <div className="h-2 bg-[var(--theme-green)] rounded" style={{width: '80%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Less than 20 seconds</span>
                    <div className="flex-1 mx-3 h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-[var(--theme-red)] rounded" style={{width: '60%'}}></div>
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
                      <div className="text-lg font-bold text-[var(--theme-green)]">${mockKPIData.avgWinningTrade.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-[var(--theme-red)]">-${Math.abs(mockKPIData.avgLosingTrade).toFixed(2)}</div>
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
                      value={mockKPIData.bestDay}
                      max={300}
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
                      value={mockKPIData.avgPositionMfe}
                      max={20}
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
                      <span className="text-[var(--theme-green)]">$437.28</span>
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
                    <div className="text-4xl font-bold text-[var(--theme-green)]">
                      {mockKPIData.maxConsecutiveWins}
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
                    <div className="text-4xl font-bold text-[var(--theme-red)]">
                      {mockKPIData.maxConsecutiveLosses}
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