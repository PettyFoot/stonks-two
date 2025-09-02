'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartDataPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAxis, CHART_FORMATTERS } from '@/lib/chartFormatters';
import { determineOptimalInterval, formatDateForInterval, parsePeriodToDate, calculateTickInterval } from '@/lib/timeIntervals';

interface EquityChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  color?: string;
  useConditionalColors?: boolean;
  positiveColor?: string;
  negativeColor?: string;
}

const EquityChart = React.memo(function EquityChart({ 
  data, 
  title, 
  height = 300,
  showGrid = true,
  showTooltip = true,
  color = 'var(--theme-green)',
  useConditionalColors = false,
  positiveColor = 'var(--theme-green)',
  negativeColor = 'var(--theme-red)'
}: EquityChartProps) {
  // Determine optimal interval based on data range
  const timeInterval = React.useMemo(() => {
    if (data.length === 0) return null;
    
    const firstDate = data[0]?.date;
    const lastDate = data[data.length - 1]?.date;
    
    if (!firstDate || !lastDate) return null;
    
    try {
      const start = new Date(firstDate);
      const end = new Date(lastDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      
      return determineOptimalInterval({ start, end });
    } catch {
      return null;
    }
  }, [data]);

  const formatTooltipValue = React.useCallback((value: number) => {
    return `$${value.toFixed(2)}`;
  }, []);

  const formatXAxisTick = React.useCallback((value: string) => {
    // Use intelligent time interval formatting if available
    if (timeInterval && (value.includes('-') || value.match(/^\d{4}/) || value.match(/W\d{2}/))) {
      try {
        const date = parsePeriodToDate(value, timeInterval.type);
        return formatDateForInterval(date, timeInterval.type);
      } catch {
        return formatTimeAxis(value, 'short');
      }
    }
    
    return formatTimeAxis(value, 'short');
  }, [timeInterval]);

  // Calculate tick interval to prevent overcrowding
  const tickInterval = React.useMemo(() => {
    return calculateTickInterval(data.length, timeInterval?.tickCount || 8);
  }, [data.length, timeInterval]);

  // Calculate dynamic left margin based on max value to prevent label cutoff
  const leftMargin = React.useMemo(() => {
    const maxValue = Math.max(...data.map(d => Math.abs(d.value || 0)), 0);
    if (maxValue >= 1000000) return 45; // For values like $1.5M
    if (maxValue >= 10000) return 40;   // For values like $78.5K
    return 5; // For smaller values
  }, [data]);

  // Calculate gradient offset for positive/negative value coloring
  const gradientOffset = React.useMemo(() => {
    if (!useConditionalColors || data.length === 0) return null;
    
    const values = data.map(d => d.value || 0);
    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);
    
    if (dataMax <= 0) {
      // All values are negative or zero
      return 0;
    } else if (dataMin >= 0) {
      // All values are positive or zero
      return 1;
    } else {
      // Mixed values - calculate where zero line falls
      return dataMax / (dataMax - dataMin);
    }
  }, [data, useConditionalColors]);

  // Determine line color - use gradient ID when conditional colors are enabled
  const lineColor = React.useMemo(() => {
    if (!useConditionalColors) return color;
    return gradientOffset !== null ? 'url(#splitColor)' : color;
  }, [useConditionalColors, color, gradientOffset]);

  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <Card className="bg-surface border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-medium text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-muted" style={{ height: `${height}px` }}>
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: leftMargin, bottom: 5 }}>
            {useConditionalColors && gradientOffset !== null && (
              <defs>
                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={gradientOffset} stopColor={positiveColor} stopOpacity={1}/>
                  <stop offset={gradientOffset} stopColor={negativeColor} stopOpacity={1}/>
                </linearGradient>
              </defs>
            )}
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--theme-chart-grid)" 
                horizontal={true}
                vertical={false}
              />
            )}
            <XAxis 
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-primary-text)' }}
              tickFormatter={formatXAxisTick}
              interval={tickInterval}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-primary-text)' }}
              tickFormatter={CHART_FORMATTERS.currency.formatAxisValue}
              domain={['dataMin', 'dataMax']}
            />
            {showTooltip && (
              <Tooltip 
                formatter={(value: number) => [formatTooltipValue(value), 'P&L']}
                labelFormatter={(value) => formatTimeAxis(String(value), 'long')}
                contentStyle={{
                  backgroundColor: 'var(--theme-chart-tooltip-bg)',
                  border: '1px solid var(--theme-chart-grid)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  color: 'var(--theme-chart-tooltip-text)'
                }}
              />
            )}
            <ReferenceLine y={0} stroke="#f3f3f3" strokeDasharray="2 2" />
            <Line 
              type="linear" 
              dataKey="value" 
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export default EquityChart;