'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartDataPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeAxis } from '@/lib/chartFormatters';
import { determineOptimalInterval, formatDateForInterval, formatDateRangeForInterval, parsePeriodToDate } from '@/lib/timeIntervals';

interface ConditionalBarChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
  positiveColor?: string;
  negativeColor?: string;
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
}

const ConditionalBarChart = React.memo(function ConditionalBarChart({ 
  data, 
  title, 
  height = 300,
  positiveColor = 'var(--theme-green)',
  negativeColor = 'var(--theme-red)',
  showValues = false,
  valueFormatter = (value: number) => `$${value.toFixed(2)}`
}: ConditionalBarChartProps) {
  const getBarColor = React.useCallback((value: number) => value >= 0 ? positiveColor : negativeColor, [positiveColor, negativeColor]);

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

  // Custom label component for showing values on bars
  const CustomLabel = (props: { x: number; y: number; width: number; height: number; value: number }) => {
    const { x, y, width, height, value } = props;
    const labelY = value >= 0 ? y - 5 : y + height + 15;
    
    if (!showValues || Math.abs(value) < 0.01) return null;
    
    return (
      <text 
        x={x + width / 2} 
        y={labelY} 
        textAnchor="middle" 
        fontSize="10" 
        fill="var(--theme-secondary-text)"
      >
        {valueFormatter(value)}
      </text>
    );
  };

  const formatTooltipValue = React.useCallback((value: number, name: string) => {
    if (name === 'P&L' || name === 'Value') {
      return [valueFormatter(value), name];
    }
    return [value, name];
  }, [valueFormatter]);

  const formatAxisLabel = React.useCallback((value: string) => {
    // For showing the overall data timeframe range instead of individual dates
    if (timeInterval && data.length > 1) {
      try {
        const firstDate = new Date(data[0]?.date);
        const lastDate = new Date(data[data.length - 1]?.date);
        
        if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
          // Show the date range for the entire dataset
          return formatDateRangeForInterval(firstDate, lastDate, timeInterval.type);
        }
      } catch {
        // Fall through to original logic
      }
    }
    
    // Use intelligent time interval formatting for individual dates if range fails
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
    // Truncate long labels
    return value.length > 10 ? `${value.substring(0, 8)}...` : value;
  }, [timeInterval, data]);

  // Calculate tick interval to prevent overcrowding (unused but kept for future use)
  // const tickInterval = React.useMemo(() => {
  //   return calculateTickInterval(data.length, timeInterval?.tickCount || 8);
  // }, [data.length, timeInterval]);

  // Memoize bar cells for performance
  const barCells = React.useMemo(() => 
    data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
    )), [data, getBarColor]);

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={data} 
            margin={{ top: showValues ? 20 : 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--theme-chart-grid)" 
              horizontal={true} 
              vertical={false} 
            />
            <XAxis 
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-secondary-text)' }}
              tickFormatter={(value, index) => {
                // For the first and middle ticks, show the overall range
                if (index === 0 && data.length > 1) {
                  return formatAxisLabel(value);
                }
                // Hide other individual ticks to avoid clutter
                return '';
              }}
              interval={0}
              tickCount={1}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-secondary-text)' }}
              tickFormatter={(value) => {
                if (Math.abs(value) >= 1000) {
                  return `$${(value / 1000).toFixed(1)}K`;
                }
                return `$${value}`;
              }}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Period: ${label}`}
              contentStyle={{
                backgroundColor: 'var(--theme-chart-tooltip-bg)',
                border: '1px solid var(--theme-chart-grid)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[2, 2, 0, 0]}
              label={showValues ? (props: { x: number; y: number; width: number; height: number; value: number }) => <CustomLabel {...props} /> : false}
            >
              {barCells}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export default ConditionalBarChart;