'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Helper function for currency formatting
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = absValue.toFixed(2);
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
};
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LargestGainLossGaugeProps {
  title: string;
  largestGain: number;
  largestLoss: number;
  height?: number;
}

export default function LargestGainLossGauge({ 
  title, 
  largestGain, 
  largestLoss,
  height = 180
}: LargestGainLossGaugeProps) {
  
  // Calculate proportional values for the pie chart
  // Handle the case where largestLoss might be positive (meaning no actual losses exist)
  const gainValue = largestGain > 0 ? largestGain : 0;
  const lossValue = largestLoss < 0 ? Math.abs(largestLoss) : 0;
  
  // Create data for pie chart - each section proportional to its value
  // Only include segments that have positive values to avoid rendering issues
  const data = [
    ...(gainValue > 0 ? [{
      name: 'gain',
      value: gainValue,
      fill: 'var(--theme-green)'
    }] : []),
    ...(lossValue > 0 ? [{
      name: 'loss',
      value: lossValue,
      fill: 'var(--theme-red)'
    }] : [])
  ];

  // If no data, create a small placeholder to show the chart structure
  if (data.length === 0) {
    data.push({
      name: 'placeholder',
      value: 1,
      fill: 'var(--theme-muted)'
    });
  }
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { name?: string }; value?: number }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      if (data.payload?.name === 'gain') {
        return (
          <div className="text-xs rounded px-2 py-1 shadow-lg" style={{backgroundColor: 'var(--theme-chart-tooltip-bg)', color: 'var(--theme-chart-tooltip-text)'}}>
            Gain: {formatCurrency(largestGain)}
          </div>
        );
      } else if (data.payload?.name === 'loss') {
        return (
          <div className="text-xs rounded px-2 py-1 shadow-lg" style={{backgroundColor: 'var(--theme-chart-tooltip-bg)', color: 'var(--theme-chart-tooltip-text)'}}>
            Loss: {formatCurrency(largestLoss)}
          </div>
        );
      } else if (data.payload?.name === 'placeholder') {
        return (
          <div className="text-xs rounded px-2 py-1 shadow-lg" style={{backgroundColor: 'var(--theme-chart-tooltip-bg)', color: 'var(--theme-chart-tooltip-text)'}}>
            No data available
          </div>
        );
      }
    }
    return null;
  };
  
  return (
    <Card className="bg-surface border-default overflow-hidden" style={{ height }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center" style={{ height: `calc(100% - 60px)` }}>
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Pie Gauge */}
          <div className="w-40 h-20 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Values display */}
          <div className="flex justify-between w-full text-xs px-4">
            <div className="text-center font-medium" style={{color: 'var(--theme-green)'}}>
              {formatCurrency(largestGain)}
            </div>
            <div className="text-center font-medium" style={{color: 'var(--theme-red)'}}>
              {formatCurrency(largestLoss)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}