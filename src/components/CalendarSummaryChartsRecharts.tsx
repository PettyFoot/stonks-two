'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  daily: Array<{ day: number; pnl: number; trades: number; shares: number }>;
  monthly: Array<{ month: number; monthName: string; pnl: number; trades: number; shares: number }>;
  yearly: Array<{ year: number; pnl: number; trades: number; shares: number }>;
}

export default function CalendarSummaryChartsRecharts() {
  const [timeframe] = useState<'month' | 'year' | 'all'>('all');
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummaryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/summary?timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        
        // Log the aggregated data received from API
        console.log('\n=== SUMMARY CHARTS DATA ===');
        console.log('Daily Performance (by day of month):');
        data.daily.forEach((d: any) => {
          console.log(`  Day ${d.day}: P&L $${d.pnl}, Trades: ${d.trades}`);
        });
        
        console.log('\nMonthly Performance:');
        data.monthly.forEach((m: any) => {
          console.log(`  ${m.monthName} (${m.month}): P&L $${m.pnl}, Trades: ${m.trades}`);
        });
        
        console.log('\nYearly Performance:');
        data.yearly.forEach((y: any) => {
          console.log(`  ${y.year}: P&L $${y.pnl}, Trades: ${y.trades}`);
        });
        console.log('=== END SUMMARY DATA ===\n');
        
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
      trades: dayItem?.trades || 0,
      shares: dayItem?.shares || 0
    };
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthData = monthNames.map((name, i) => {
    const monthItem = data.monthly.find(m => m.month === i + 1);
    return {
      month: name,
      pnl: monthItem?.pnl || 0,
      trades: monthItem?.trades || 0,
      shares: monthItem?.shares || 0
    };
  });

  const yearData = data.yearly.map(y => ({
    year: y.year.toString(),
    pnl: y.pnl,
    trades: y.trades,
    shares: y.shares
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
              axisLine={!showZeroLine}
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
                stroke="#f3f3f3" 
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

  const formatShares = (value: number | string) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Dual-axis chart component for trade distribution
  const DualAxisChart = ({ 
    title, 
    data, 
    xKey,
    xLabel,
    xAxisInterval = 0
  }: {
    title: string;
    data: Record<string, unknown>[];
    xKey: string;
    xLabel: string;
    xAxisInterval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
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
              yAxisId="left"
              orientation="left"
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 12, fill: '#53565c' }}
              tickFormatter={formatTrades}
              stroke="#E5E7EB"
              label={{ 
                value: 'Trade Count', 
                angle: -90, 
                position: 'insideLeft', 
                style: { 
                  textAnchor: 'middle', 
                  fontSize: '12px', 
                  fill: 'var(--theme-green)' 
                } 
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 12, fill: '#53565c' }}
              tickFormatter={formatShares}
              stroke="#E5E7EB"
              label={{ 
                value: 'Share Volume', 
                angle: 90, 
                position: 'insideRight', 
                style: { 
                  textAnchor: 'middle', 
                  fontSize: '12px', 
                  fill: '#3b82f6' 
                } 
              }}
            />
            <Tooltip 
              formatter={(value: number | string, name: string) => {
                if (name === 'trades') return [formatTrades(value), 'Trades'];
                if (name === 'shares') return [formatShares(value), 'Shares'];
                return [value, name];
              }}
              contentStyle={{
                backgroundColor: 'var(--theme-chart-tooltip-bg)',
                border: '1px solid var(--theme-chart-grid)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: 'var(--theme-secondary-text)' }}
            />
            <Bar 
              yAxisId="left"
              dataKey="trades"
              fill="var(--theme-green)"
              name="trades"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="right"
              dataKey="shares"
              fill="#3b82f6"
              name="shares"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
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
          <DualAxisChart
            title="TRADE DISTRIBUTION BY DAY"
            data={dayData}
            xKey="day"
            xLabel="Day of Month"
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
          <DualAxisChart
            title="TRADE DISTRIBUTION BY MONTH"
            data={monthData}
            xKey="month"
            xLabel="Month"
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
          <DualAxisChart
            title="TRADE DISTRIBUTION BY YEAR"
            data={yearData}
            xKey="year"
            xLabel="Year"
            xAxisInterval={0}
          />
        </div>
      </div>
    </div>
  );
}