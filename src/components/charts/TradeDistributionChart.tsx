'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { DistributionData, ChartDataPoint } from '@/types';
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

interface TradeDistributionChartProps {
  data: DistributionData[] | ChartDataPoint[];
  title: string;
  height?: number;
  showPercentages?: boolean;
  orientation?: 'horizontal' | 'vertical';
  conditionalColors?: boolean;
  valueFormatter?: (value: number) => string;
  chartType?: ChartType;
  showReferenceLine?: boolean;
  renderMode?: 'recharts' | 'html';
  showGrid?: boolean;
  showTooltip?: boolean;
  color?: string;
  dataKey?: string;
  useConditionalColors?: boolean;
  positiveColor?: string;
  negativeColor?: string;
  showValues?: boolean;
}

export default function TradeDistributionChart({ 
  data, 
  title, 
  height = 300,
  showPercentages = false,
  orientation = 'vertical',
  conditionalColors = false,
  valueFormatter,
  chartType = 'currency',
  showReferenceLine = false,
  renderMode = 'recharts',
  showGrid = true,
  showTooltip = true,
  color = 'var(--theme-green)',
  dataKey = 'value',
  useConditionalColors = false,
  positiveColor = 'var(--theme-green)',
  negativeColor = 'var(--theme-red)',
  showValues = false
}: TradeDistributionChartProps) {
  const { isSmallScreen } = useScreenSize();

  // Determine the formatter to use
  const formatter = chartType ? CHART_FORMATTERS[chartType] : null;

  // Detect data type and normalize data structure
  const isDistributionData = (item: any): item is DistributionData => {
    return item && typeof item.category !== 'undefined' && typeof item.count !== 'undefined';
  };

  const isChartDataPoint = (item: any): item is ChartDataPoint => {
    return item && typeof item.date !== 'undefined' && typeof item.value !== 'undefined';
  };

  // Transform data for consistent structure
  const normalizedData = data.map(item => {
    if (isDistributionData(item)) {
      return {
        category: item.category,
        date: item.category,
        count: item.count,
        percentage: item.percentage,
        value: showPercentages ? item.percentage : item.count,
      };
    } else if (isChartDataPoint(item)) {
      return {
        category: item.date,
        date: item.date,
        count: item.value,
        percentage: 0,
        value: item.value,
      };
    }
    return item;
  });

  // Calculate Y-axis domain for reference line support
  const yDomain = React.useMemo(() => {
    if (!showReferenceLine) return undefined;
    
    const values = normalizedData.map(d => d.value);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    
    if (minValue >= 0) {
      return [0, maxValue === 0 ? 100 : maxValue * 1.1];
    } else if (maxValue <= 0) {
      return [minValue * 1.1, 0];
    } else {
      const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
      return [-absMax * 1.1, absMax * 1.1];
    }
  }, [normalizedData, showReferenceLine]);

  // Generate custom Y-axis ticks that always include 0
  const yTicks = React.useMemo(() => {
    if (!showReferenceLine || !yDomain) return undefined;
    
    const [min, max] = yDomain;
    const range = max - min;
    
    // Generate 5-7 evenly distributed ticks
    const tickCount = 6;
    const step = range / (tickCount - 1);
    const ticks = [];
    
    for (let i = 0; i < tickCount; i++) {
      const value = min + (step * i);
      ticks.push(Math.round(value));
    }
    
    // Ensure 0 is included if it's within the range
    if (min <= 0 && max >= 0 && !ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    
    return ticks;
  }, [yDomain, showReferenceLine]);

  // Determine optimal interval based on data range
  const timeInterval = React.useMemo(() => {
    if (normalizedData.length === 0) return null;
    
    const firstDate = normalizedData[0]?.date;
    const lastDate = normalizedData[normalizedData.length - 1]?.date;
    
    if (!firstDate || !lastDate) return null;
    
    try {
      const start = new Date(firstDate);
      const end = new Date(lastDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      
      return determineOptimalInterval({ start, end });
    } catch {
      return null;
    }
  }, [normalizedData]);

  const formatTooltip = (value: number, name: string, props: { payload?: any }) => {
    const { payload } = props;
    if (!payload) return [value, name];

    // Use custom formatter if provided
    if (valueFormatter) {
      return [valueFormatter(value), name];
    }

    // Use chart type formatter if available
    if (formatter && (name === 'P&L' || name === 'Value' || name === dataKey)) {
      return formatter.formatTooltipValue(value, name);
    }

    // Distribution data specific formatting
    const percentage = payload.percentage || 0;
    const count = payload.count || 0;
    
    if (name === 'count' || name === 'value') {
      if (percentage > 0) {
        return [`${count} trades (${percentage.toFixed(1)}%)`, 'Trade Count'];
      }
      return [count.toString(), 'Count'];
    }
    
    return [value, name];
  };

  const formatAxisLabel = (value: string) => {
    // Handle different time formats
    if (value.includes(':')) {
      // Time format (e.g., "09:00")
      return value;
    }
    
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
    
    if (value.length > 12) {
      // Long category names
      return `${value.substring(0, 10)}...`;
    }
    
    return value;
  };

  // Calculate tick interval to prevent overcrowding
  const tickInterval = React.useMemo(() => {
    if (normalizedData.length > 0 && normalizedData[0]?.date) {
      const firstDate = normalizedData[0].date;
      
      // Show all labels for duration-related charts
      if (firstDate.includes('min') || firstDate.includes('hr') || 
          firstDate === 'Intraday' || firstDate === 'Multiday') {
        return 0; // Show all labels
      }
      
      // Show all labels for price bucket charts (numeric ranges like "0-1", "1-5", etc.)
      if (firstDate.match(/^\d+[-–]\d+$/) || firstDate.match(/^\d+\+$/)) {
        return 0; // Show all labels
      }
    }
    return calculateTickInterval(normalizedData.length, timeInterval?.tickCount || 8);
  }, [normalizedData, timeInterval]);

  const getBarColor = (value: number, category?: string) => {
    if (conditionalColors || useConditionalColors) {
      // For category-based coloring (like "Winning" vs "Losing")
      if (category) {
        if (category.toLowerCase().includes('losing') || category.toLowerCase().includes('loss')) {
          return negativeColor;
        }
        if (category.toLowerCase().includes('winning') || category.toLowerCase().includes('win')) {
          return positiveColor;
        }
      }
      // Fallback to value-based coloring
      return value >= 0 ? positiveColor : negativeColor;
    }
    return color;
  };

  // Custom label component for showing values on bars
  const CustomLabel = (props: { x: number; y: number; width: number; height: number; value: number }) => {
    const { x, y, width, height, value } = props;
    const labelY = value >= 0 ? y - 5 : y + height + 15;
    
    if (!showValues || Math.abs(value) < 0.01) return null;
    
    const displayValue = valueFormatter ? valueFormatter(value) : value.toString();
    
    return (
      <text 
        x={x + width / 2} 
        y={labelY} 
        textAnchor="middle" 
        fontSize="10" 
        fill="var(--theme-secondary-text)"
      >
        {displayValue}
      </text>
    );
  };

  if (orientation === 'horizontal') {
    if (renderMode === 'html') {
      // HTML-based horizontal bars (like HorizontalBarChart)
      const maxValue = Math.max(...normalizedData.map(d => Math.abs(d.value)), 1);
      
      return (
        <Card className="bg-surface border-default overflow-hidden" style={{ height }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base font-medium text-primary">{title}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: `calc(100% - 52px)`, padding: '0.75rem 1rem' }}>
            <div className="h-full flex flex-col justify-center gap-3">
              {normalizedData.map((item, index) => {
                const rawPercentage = (Math.abs(item.value) / maxValue) * 100;
                const minPercentage = 25;
                const scaledRange = 100 - minPercentage;
                const percentage = item.value !== 0 ? minPercentage + (rawPercentage / 100) * scaledRange : 3;
                const itemColor = getBarColor(item.value, item.category || item.date);
                const displayValue = valueFormatter ? valueFormatter(item.value) : 
                  (item.count ? `${item.count}` : item.value.toFixed(2));
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-medium min-w-[60px]" style={{ color: 'var(--theme-primary-text)' }}>
                      {formatAxisLabel(item.category || item.date || '')}
                    </span>
                    
                    <div className="flex-1">
                      <div className="w-full h-6">
                        {item.value === 0 ? (
                          <div
                            className="h-full w-full transition-all duration-500 ease-out rounded-sm flex items-center justify-center"
                            style={{ backgroundColor: 'var(--theme-chart-grid)' }}
                          >
                            <span className="text-xs font-semibold px-2" style={{ color: 'var(--theme-secondary-text)' }}>
                              {displayValue}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="h-full transition-all duration-500 ease-out rounded-sm flex items-center justify-center"
                            style={{ width: `${percentage}%`, backgroundColor: itemColor }}
                          >
                            <span className="text-xs text-white font-semibold px-2">
                              {displayValue}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    } else {
      // Original horizontal layout with improved data handling
      return (
        <Card className="bg-surface border-default">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {normalizedData.map((item, index) => {
                const maxValue = Math.max(...normalizedData.map(d => d.value));
                const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                const itemColor = getBarColor(item.value, item.category || item.date);
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-sm text-muted-foreground text-right">
                      {formatAxisLabel(item.category || item.date || '')}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-muted/20 rounded">
                        <div 
                          className="h-full rounded transition-all duration-300"
                          style={{ backgroundColor: itemColor, width: `${Math.abs(barWidth)}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {item.count || item.value}
                      </div>
                    </div>
                    <div className="w-12 text-sm text-muted-foreground">
                      {item.percentage ? `${item.percentage.toFixed(1)}%` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // Handle empty data case
  if (!normalizedData || normalizedData.length === 0) {
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
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={normalizedData} 
            margin={{ 
              top: showValues ? 20 : 5, 
              right: 5, 
              left: 0, 
              bottom: isSmallScreen ? 40 : 20 
            }}
          >
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
              tickFormatter={formatAxisLabel}
              interval={tickInterval}
            />
            <YAxis 
              domain={yDomain}
              ticks={yTicks}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-primary-text)' }}
              tickFormatter={(value) => {
                if (formatter) {
                  return formatter.formatAxisValue(value);
                }
                if (showPercentages) {
                  return `${value}%`;
                }
                if (Math.abs(value) >= 1000) {
                  return `$${(value / 1000).toFixed(1)}K`;
                }
                return value.toString();
              }}
              width={50}
            />
            {showReferenceLine && (
              <ReferenceLine 
                y={0} 
                stroke="var(--theme-chart-grid)" 
                strokeDasharray="5 5"
                strokeWidth={1}
              />
            )}
            {showTooltip && (
              <Tooltip 
                formatter={(value: number, name: string) => formatTooltip(value, name, { payload: normalizedData.find(d => d.value === value) })}
                labelFormatter={(label) => {
                  if (typeof label === 'string') {
                    if (label.includes('min') || label.includes('hr') || 
                        label === 'Intraday' || label === 'Multiday') {
                      return label;
                    }
                    if (label.includes('-') || label.match(/^\d{4}-\d{2}$/)) {
                      return formatTimeAxis(label, 'long');
                    }
                  }
                  return `Period: ${label}`;
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
              label={showValues ? (props: { x: number; y: number; width: number; height: number; value: number }) => <CustomLabel {...props} /> : false}
            >
              {(conditionalColors || useConditionalColors) && normalizedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.value, entry.category || entry.date)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}