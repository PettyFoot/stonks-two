'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_HEIGHTS } from '@/constants/chartHeights';

interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export default function CustomPieChart({ 
  data, 
  title, 
  height = CHART_HEIGHTS.SM,
  showLegend = false,
  showTooltip = true,
  innerRadius,
  outerRadius
}: PieChartProps) {
  // Calculate radius based on available height
  const containerHeight = height - 60; // Account for header only
  const maxRadius = Math.min(containerHeight / 2.2, 100); // Leave more space for better centering
  const calculatedOuterRadius = outerRadius || maxRadius * 0.85;
  const calculatedInnerRadius = innerRadius || maxRadius * 0.45;
  const formatTooltipValue = (value: number, name: string) => {
    const item = data.find(d => d.name === name);
    const percentage = item?.percentage || ((value / data.reduce((sum, d) => sum + Math.abs(d.value), 0)) * 100);
    return [`$${Math.abs(value).toFixed(2)} (${percentage.toFixed(1)}%)`, name];
  };

  return (
    <Card className="bg-surface border-default" style={{ height }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center" style={{ height: `calc(100% - 50px)`, padding: '0.5rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={calculatedInnerRadius}
              outerRadius={calculatedOuterRadius}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {showTooltip && (
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
            )}
            {showLegend && (
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}