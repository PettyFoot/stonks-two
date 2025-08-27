'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TradeData {
  date: string;
  pnl: number;
}

interface MonthTradeDistributionChartProps {
  data: TradeData[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export default function MonthTradeDistributionChart({
  data = [],
  title = 'Daily P&L Distribution',
  height = 300,
  showGrid = true,
  showTooltip = true
}: MonthTradeDistributionChartProps) {
  
  // Calculate Y-axis domain and check for negative values
  const { yDomain, hasNegativeValues, validData } = useMemo(() => {
    // Filter out invalid data
    const validData = (data || []).filter(d => 
      d && 
      typeof d.pnl === 'number' && 
      !isNaN(d.pnl) && 
      d.date
    );
    
    if (validData.length === 0) {
      return {
        yDomain: [0, 100],
        hasNegativeValues: false,
        validData: []
      };
    }
    
    const values = validData.map(d => d.pnl);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    
    // Calculate domain with padding
    let domain: [number, number];
    if (minValue >= 0) {
      domain = [0, maxValue === 0 ? 100 : maxValue * 1.1];
    } else if (maxValue <= 0) {
      domain = [minValue * 1.1, 0];
    } else {
      const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
      domain = [-absMax * 1.1, absMax * 1.1];
    }
    
    return {
      yDomain: domain,
      hasNegativeValues: minValue < 0,
      validData
    };
  }, [data]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Format currency values
  const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return '$0';
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}k`;
    }
    return `${value < 0 ? '-' : ''}$${absValue.toFixed(0)}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: TradeData }> }) => {
    if (active && payload && payload.length && payload[0]) {
      const data = payload[0].payload;
      if (!data) return null;
      
      return (
        <div className="p-3 border rounded-lg shadow-lg" style={{backgroundColor: 'var(--theme-chart-tooltip-bg)', borderColor: 'var(--theme-chart-grid)'}}>
          <p className="text-sm font-medium" style={{color: 'var(--theme-secondary-text)'}}>
            {formatDate(data.date)}
          </p>
          <p className="text-lg font-bold" style={{color: data.pnl >= 0 ? 'var(--theme-green)' : 'var(--theme-red)'}}>
            {data.pnl >= 0 ? '+' : ''}{formatCurrency(data.pnl)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Handle empty data case
  if (!validData || validData.length === 0) {
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
          <BarChart 
            data={validData} 
            margin={{ top: 20, right: 20, left: 50, bottom: 60 }}
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
              axisLine={{ stroke: 'var(--theme-chart-axis)' }}
              tickLine={{ stroke: 'var(--theme-chart-axis)' }}
              tick={{ fontSize: 10, fill: 'var(--theme-secondary-text)' }}
              tickFormatter={formatDate}
              angle={-45}
              textAnchor="end"
            />
            
            <YAxis
              domain={yDomain}
              axisLine={{ stroke: 'var(--theme-chart-axis)' }}
              tickLine={{ stroke: 'var(--theme-chart-axis)' }}
              tick={{ fontSize: 11, fill: 'var(--theme-secondary-text)' }}
              tickFormatter={formatCurrency}
            />
            
            {/* Reference line at zero if there are negative values */}
            {hasNegativeValues && (
              <ReferenceLine 
                y={0} 
                stroke="var(--theme-secondary-text)" 
                strokeDasharray="5 5"
                strokeWidth={1}
              />
            )}
            
            {showTooltip && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />}
            
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {validData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pnl >= 0 ? 'var(--theme-green)' : 'var(--theme-red)'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}