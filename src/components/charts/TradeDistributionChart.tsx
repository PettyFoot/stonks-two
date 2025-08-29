'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DistributionData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TradeDistributionChartProps {
  data: DistributionData[];
  title: string;
  height?: number;
  showPercentages?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export default function TradeDistributionChart({ 
  data, 
  title, 
  height = 300,
  showPercentages = false,
  orientation = 'vertical'
}: TradeDistributionChartProps) {
  
  const formatTooltip = (value: number, name: string, props: { payload?: { percentage?: number; count?: number } }) => {
    const { payload } = props;
    if (!payload) return [value, name];

    const percentage = payload.percentage || 0;
    const count = payload.count || 0;
    
    if (name === 'count') {
      return [`${count} trades (${percentage.toFixed(1)}%)`, 'Trade Count'];
    }
    
    return [value, name];
  };

  const formatAxisLabel = (value: string) => {
    // Handle different time formats
    if (value.includes(':')) {
      // Time format (e.g., "09:00")
      return value;
    }
    
    if (value.length > 12) {
      // Long category names
      return `${value.substring(0, 10)}...`;
    }
    
    return value;
  };

  // Transform data for chart
  const chartData = data.map(item => ({
    category: item.category,
    count: item.count,
    percentage: item.percentage,
    value: showPercentages ? item.percentage : item.count,
  }));

  if (orientation === 'horizontal') {
    // For horizontal charts, we'll use a different layout
    return (
      <Card className="bg-surface border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData.map((item, index) => {
              const maxValue = Math.max(...chartData.map(d => d.count));
              const barWidth = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-muted-foreground text-right">
                    {formatAxisLabel(item.category || '')}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-6 bg-muted/20 rounded">
                      <div 
                        className="h-full rounded transition-all duration-300"
                        style={{ backgroundColor: 'var(--theme-green)', width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {item.count}
                    </div>
                  </div>
                  <div className="w-12 text-sm text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
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
            data={chartData} 
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--theme-chart-grid)" 
              horizontal={true} 
              vertical={false} 
            />
            <XAxis 
              dataKey="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-primary-text)' }}
              tickFormatter={formatAxisLabel}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--theme-primary-text)' }}
              tickFormatter={(value) => {
                if (showPercentages) {
                  return `${value}%`;
                }
                return value.toString();
              }}
            />
            <Tooltip 
              formatter={formatTooltip}
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
              fill="var(--theme-green)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}