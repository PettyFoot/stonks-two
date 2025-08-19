'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartDataPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAxis } from '@/lib/chartFormatters';
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
  color = '#16A34A',
  useConditionalColors = false,
  positiveColor = '#16A34A',
  negativeColor = '#DC2626'
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

  // Determine line color based on last value when using conditional colors
  const lineColor = React.useMemo(() => {
    if (!useConditionalColors) return color;
    
    // Get the last non-null value
    const lastValue = data.length > 0 ? data[data.length - 1]?.value ?? 0 : 0;
    return lastValue >= 0 ? positiveColor : negativeColor;
  }, [data, useConditionalColors, color, positiveColor, negativeColor]);

  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <Card className="bg-surface border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
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
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E5E7EB" 
                horizontal={true}
                vertical={false}
              />
            )}
            <XAxis 
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={formatXAxisTick}
              interval={tickInterval}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => `$${value}`}
            />
            {showTooltip && (
              <Tooltip 
                formatter={(value: number) => [formatTooltipValue(value), 'P&L']}
                labelFormatter={(value) => formatTimeAxis(String(value), 'long')}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
            )}
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
            <Line 
              type="monotone" 
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