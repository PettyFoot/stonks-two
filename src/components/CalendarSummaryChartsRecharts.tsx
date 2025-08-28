'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChartData {
  daily: Array<{ day: number; pnl: number; trades: number }>;
  monthly: Array<{ month: number; monthName: string; pnl: number; trades: number }>;
  yearly: Array<{ year: number; pnl: number; trades: number }>;
}

export default function CalendarSummaryChartsRecharts() {
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

  // Prepare chart data
  const dayData = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const dayItem = data.daily.find(d => d.day === day);
    return {
      day: day.toString(),
      pnl: dayItem?.pnl || 0,
      trades: dayItem?.trades || 0
    };
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthData = monthNames.map((name, i) => {
    const monthItem = data.monthly.find(m => m.month === i + 1);
    return {
      month: name,
      pnl: monthItem?.pnl || 0,
      trades: monthItem?.trades || 0
    };
  });

  const yearData = data.yearly.map(y => ({
    year: y.year.toString(),
    pnl: y.pnl,
    trades: y.trades
  }));

  // Custom chart component
  const SummaryChart = ({ 
    title, 
    data, 
    dataKey, 
    xKey,
    xLabel,
    yLabel,
    formatter,
    useConditionalColors = false,
    xAxisInterval = 0,
    showZeroLine = false
  }: {
    title: string;
    data: Record<string, unknown>[];
    dataKey: string;
    xKey: string;
    xLabel: string;
    yLabel: string;
    formatter: (value: number) => string;
    useConditionalColors?: boolean;
    xAxisInterval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
    showZeroLine?: boolean;
  }) => (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 40, bottom: 40 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--theme-chart-grid)" 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              dataKey={xKey}
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 12, fill: '#53565c' }}
              interval={xAxisInterval}
              stroke="#E5E7EB"
              label={{ 
                value: xLabel, 
                position: 'insideBottom', 
                offset: -5, 
                style: { 
                  textAnchor: 'middle', 
                  fontSize: '12px', 
                  fill: '#53565c' 
                } 
              }}
            />
            <YAxis 
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 12, fill: '#53565c' }}
              tickFormatter={formatter}
              stroke="#E5E7EB"
              label={{ 
                value: yLabel, 
                angle: -90, 
                position: 'insideLeft', 
                style: { 
                  textAnchor: 'middle', 
                  fontSize: '12px', 
                  fill: '#53565c' 
                } 
              }}
            />
            {showZeroLine && (
              <ReferenceLine 
                y={0} 
                stroke="#5688C7" 
                strokeWidth={2}
              />
            )}
            <Tooltip 
              formatter={(value: number | string) => formatter(Number(value))}
              contentStyle={{
                backgroundColor: 'var(--theme-chart-tooltip-bg)',
                border: '1px solid var(--theme-chart-grid)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: 'var(--theme-secondary-text)' }}
              itemStyle={{ color: 'var(--theme-green)' }}
            />
            <Bar 
              dataKey={dataKey}
              fill="var(--theme-green)"
              radius={[4, 4, 0, 0]}
            >
              {useConditionalColors && data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={Number(entry[dataKey]) >= 0 ? 'var(--theme-green)' : 'var(--theme-red)'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num)) return '$0';
    return `$${num.toFixed(0)}`;
  };
  
  const formatTrades = (value: number | string) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num)) return '0';
    return num.toString();
  };

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

      {/* Charts Grid - Exact order as specified */}
      <div className="space-y-6">
        {/* Row 1: Day of Month Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SummaryChart
            title="PERFORMANCE BY DAY OF MONTH"
            data={dayData}
            dataKey="pnl"
            xKey="day"
            xLabel="Day of Month"
            yLabel="P&L ($)"
            formatter={formatCurrency}
            useConditionalColors={true}
            xAxisInterval={4}
            showZeroLine={true}
          />
          <SummaryChart
            title="TRADE DISTRIBUTION BY DAY"
            data={dayData}
            dataKey="trades"
            xKey="day"
            xLabel="Day of Month"
            yLabel="Trade Count"
            formatter={formatTrades}
            useConditionalColors={false}
            xAxisInterval={4}
          />
        </div>

        {/* Row 2: Month of Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SummaryChart
            title="PERFORMANCE BY MONTH"
            data={monthData}
            dataKey="pnl"
            xKey="month"
            xLabel="Month"
            yLabel="P&L ($)"
            formatter={formatCurrency}
            useConditionalColors={true}
            xAxisInterval={1}
            showZeroLine={true}
          />
          <SummaryChart
            title="TRADE DISTRIBUTION BY MONTH"
            data={monthData}
            dataKey="trades"
            xKey="month"
            xLabel="Month"
            yLabel="Trade Count"
            formatter={formatTrades}
            useConditionalColors={false}
            xAxisInterval={1}
          />
        </div>

        {/* Row 3: Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SummaryChart
            title="PERFORMANCE BY YEAR"
            data={yearData}
            dataKey="pnl"
            xKey="year"
            xLabel="Year"
            yLabel="P&L ($)"
            formatter={formatCurrency}
            useConditionalColors={true}
            xAxisInterval={0}
            showZeroLine={true}
          />
          <SummaryChart
            title="TRADE DISTRIBUTION BY YEAR"
            data={yearData}
            dataKey="trades"
            xKey="year"
            xLabel="Year"
            yLabel="Trade Count"
            formatter={formatTrades}
            useConditionalColors={false}
            xAxisInterval={0}
          />
        </div>
      </div>
    </div>
  );
}