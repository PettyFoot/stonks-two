'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartDataPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartType, CHART_FORMATTERS, formatTimeAxis } from '@/lib/chartFormatters';
import { determineOptimalInterval, formatDateForInterval, parsePeriodToDate, calculateTickInterval } from '@/lib/timeIntervals';

// Custom hook to detect screen size
const useScreenSize = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768); // md breakpoint is 768px
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isSmallScreen };
};

interface BarChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  color?: string;
  dataKey?: string;
  chartType?: ChartType;
  useConditionalColors?: boolean;
}

const CustomBarChart = React.memo(function CustomBarChart({ 
  data, 
  title, 
  height = 300,
  showGrid = true,
  showTooltip = true,
  color = 'var(--theme-green)',
  dataKey = 'value',
  chartType = 'currency',
  useConditionalColors = false
}: BarChartProps) {
  const formatter = CHART_FORMATTERS[chartType];
  const { isSmallScreen } = useScreenSize();

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
    // Check if this is a price bucket (starts with $ or < or >)
    if (value.startsWith('$') || value.startsWith('<') || value.startsWith('>')) {
      return value;
    }
    
    // Check if this is a numeric range (like "50-100" or "1-2")
    if (value.match(/^\d+[-–]\d+$/)) {
      return value;
    }
    
    // Check if this is a duration bucket (contains min, hr, etc.) or simple duration labels
    if (value.includes('min') || value.includes('hr') || value === 'Intraday' || value === 'Multiday') {
      return value;
    }
    
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
    // Show all labels for duration-related charts
    if (data.length > 0 && data[0]?.date && 
        (data[0].date.includes('min') || data[0].date.includes('hr') || 
         data[0].date === 'Intraday' || data[0].date === 'Multiday')) {
      return 0; // Show all labels
    }
    return calculateTickInterval(data.length, timeInterval?.tickCount || 8);
  }, [data, timeInterval]);

  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <Card className="bg-surface border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-medium text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-muted text-xs sm:text-sm" style={{ height: `${height}px` }}>
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
          <BarChart data={data} margin={{ 
            top: 5, 
            right: 5, 
            left: 0, 
            bottom: isSmallScreen ? 40 : 20 
          }}>
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
              tick={{ 
                fontSize: 12, 
                fill: 'var(--theme-primary-text)',
                textAnchor: isSmallScreen ? 'end' : 'middle'
              }}
              angle={isSmallScreen ? -45 : 0}
              tickFormatter={formatXAxisTick}
              interval={tickInterval}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-primary-text)' }}
              tickFormatter={(value) => formatter.formatAxisValue(value)}
              width={50}
            />
            {showTooltip && (
              <Tooltip 
                formatter={(value: number) => formatTooltipValue(value, title)}
                labelFormatter={(value) => {
                  if (typeof value === 'string') {
                    // Handle duration labels
                    if (value.includes('min') || value.includes('hr') || 
                        value === 'Intraday' || value === 'Multiday') {
                      return value;
                    }
                    // Handle date labels
                    if (value.includes('-') || value.match(/^\d{4}-\d{2}$/)) {
                      return formatTimeAxis(value, 'long');
                    }
                  }
                  return value;
                }}
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
            <Bar 
              dataKey={dataKey}
              fill={color}
              radius={[2, 2, 0, 0]}
            >
              {useConditionalColors && data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={(entry as unknown as Record<string, number>)[dataKey] >= 0 ? 'var(--theme-green)' : 'var(--theme-red)'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export default CustomBarChart;