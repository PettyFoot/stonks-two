'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartType, CHART_FORMATTERS, formatTimeAxis } from '@/lib/chartFormatters';
import { determineOptimalInterval, formatDateForInterval, parsePeriodToDate, calculateTickInterval } from '@/lib/timeIntervals';

interface BarChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  color?: string;
  dataKey?: string;
  chartType?: ChartType;
}

const CustomBarChart = React.memo(function CustomBarChart({ 
  data, 
  title, 
  height = 300,
  showGrid = true,
  showTooltip = true,
  color = '#16A34A',
  dataKey = 'value',
  chartType = 'currency'
}: BarChartProps) {
  const formatter = CHART_FORMATTERS[chartType];

  // Determine optimal interval based on data range
  const timeInterval = React.useMemo(() => {
    if (data.length === 0) return null;
    
    // Try to parse the first and last dates
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

  const formatTooltipValue = React.useCallback((value: number, name?: string) => {
    return formatter.formatTooltipValue(value, name);
  }, [formatter]);

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
    
    // Fallback to existing logic
    if (value.includes('-') || value.match(/^\d{4}-\d{2}$/)) {
      return formatTimeAxis(value, 'short');
    }
    return value;
  }, [timeInterval]);

  // Calculate tick interval to prevent overcrowding
  const tickInterval = React.useMemo(() => {
    return calculateTickInterval(data.length, timeInterval?.tickCount || 8);
  }, [data.length, timeInterval]);

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
              tickFormatter={(value) => formatter.formatAxisValue(value)}
            />
            {showTooltip && (
              <Tooltip 
                formatter={(value: number) => formatTooltipValue(value, title)}
                labelFormatter={(value) => {
                  if (typeof value === 'string' && (value.includes('-') || value.match(/^\d{4}-\d{2}$/))) {
                    return formatTimeAxis(value, 'long');
                  }
                  return value;
                }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
            )}
            <Bar 
              dataKey={dataKey}
              fill={color}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export default CustomBarChart;