'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BarChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  color?: string;
  dataKey?: string;
}

export default function CustomBarChart({ 
  data, 
  title, 
  height = 300,
  showGrid = true,
  showTooltip = true,
  color = '#16A34A',
  dataKey = 'value'
}: BarChartProps) {
  const formatTooltipValue = (value: number) => {
    return dataKey === 'value' ? `$${value.toFixed(2)}` : value.toString();
  };

  const formatXAxisTick = (value: string) => {
    // For dates, format them nicely
    if (value.includes('-')) {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return value;
  };

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
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => dataKey === 'value' ? `$${value}` : value.toString()}
            />
            {showTooltip && (
              <Tooltip 
                formatter={(value: number, name: string) => [formatTooltipValue(value), title]}
                labelFormatter={(value) => {
                  if (typeof value === 'string' && value.includes('-')) {
                    return new Date(value).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    });
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
}