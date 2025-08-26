'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChartData {
  daily: Array<{ day: number; pnl: number; trades: number }>;
  monthly: Array<{ month: number; monthName: string; pnl: number; trades: number }>;
  yearly: Array<{ year: number; pnl: number; trades: number }>;
}

export default function CalendarSummaryChartsSimple() {
  const [timeframe, setTimeframe] = useState<'month' | 'year' | 'all'>('all');
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummaryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/summary?timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-64">Loading charts...</div>;
  }

  // Simple bar chart component
  const SimpleBarChart = ({ title, data, maxValue, formatter = (v: number) => v.toString() }: {
    title: string;
    data: number[];
    maxValue: number;
    formatter?: (v: number) => string;
  }) => {
    const barHeight = 200;
    const scale = maxValue > 0 ? barHeight / maxValue : 1;
    
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 uppercase">{title}</h3>
        <div className="flex items-end space-x-1 h-[200px]">
          {data.map((value: number, index: number) => {
            const height = Math.abs(value) * scale;
            const isPositive = value >= 0;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end"
                title={formatter(value)}
              >
                <div
                  className={`w-full transition-all duration-300 ${
                    isPositive ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Prepare chart data
  const dayCategories = Array.from({ length: 31 }, (_, i) => i + 1);
  const dayPnlData = dayCategories.map(day => {
    const dayData = data.daily.find(d => d.day === day);
    return dayData?.pnl || 0;
  });
  const dayTradeData = dayCategories.map(day => {
    const dayData = data.daily.find(d => d.day === day);
    return dayData?.trades || 0;
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthPnlData = monthNames.map((_, i) => {
    const monthData = data.monthly.find(m => m.month === i + 1);
    return monthData?.pnl || 0;
  });
  const monthTradeData = monthNames.map((_, i) => {
    const monthData = data.monthly.find(m => m.month === i + 1);
    return monthData?.trades || 0;
  });

  const yearPnlData = data.yearly.map(y => y.pnl);
  const yearTradeData = data.yearly.map(y => y.trades);

  const maxPnl = Math.max(
    ...dayPnlData.map(Math.abs),
    ...monthPnlData.map(Math.abs),
    ...yearPnlData.map(Math.abs),
    1
  );
  const maxTrades = Math.max(
    ...dayTradeData,
    ...monthTradeData,
    ...yearTradeData,
    1
  );

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex justify-end">
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as 'month' | 'year' | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Row 1: Day of Month Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <SimpleBarChart
                title="PERFORMANCE BY DAY OF MONTH"
                data={dayPnlData}
                maxValue={maxPnl}
                formatter={(v: number) => `$${v.toFixed(2)}`}
              />
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <SimpleBarChart
                title="TRADE DISTRIBUTION BY DAY"
                data={dayTradeData}
                maxValue={maxTrades}
                formatter={(v: number) => `${v} trades`}
              />
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Month of Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <SimpleBarChart
                title="PERFORMANCE BY MONTH"
                data={monthPnlData}
                maxValue={maxPnl}
                formatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {monthNames.map(m => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <SimpleBarChart
                title="TRADE DISTRIBUTION BY MONTH"
                data={monthTradeData}
                maxValue={maxTrades}
                formatter={(v: number) => `${v} trades`}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {monthNames.map(m => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <SimpleBarChart
                title="PERFORMANCE BY YEAR"
                data={yearPnlData}
                maxValue={maxPnl}
                formatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {data.yearly.map(y => (
                  <span key={y.year}>{y.year}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <SimpleBarChart
                title="TRADE DISTRIBUTION BY YEAR"
                data={yearTradeData}
                maxValue={maxTrades}
                formatter={(v: number) => `${v} trades`}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {data.yearly.map(y => (
                  <span key={y.year}>{y.year}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}