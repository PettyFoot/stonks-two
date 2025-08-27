'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/components/charts/HorizontalBarChart';
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
  // Calculate the maximum absolute value to normalize the gauge
  const maxValue = Math.max(Math.abs(largestGain), Math.abs(largestLoss));
  
  // Calculate proportional values for the pie chart
  const gainValue = largestGain > 0 ? largestGain : 0;
  const lossValue = Math.abs(largestLoss) > 0 ? Math.abs(largestLoss) : 0;
  
  // Create data for pie chart - each section proportional to its value
  const data = [
    {
      name: 'gain',
      value: gainValue,
      fill: '#16A34A'
    },
    {
      name: 'loss',
      value: lossValue,
      fill: '#DC2626'
    }
  ];
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      if (data.payload.name === 'gain') {
        return (
          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg">
            Gain: {formatCurrency(largestGain)}
          </div>
        );
      } else if (data.payload.name === 'loss') {
        return (
          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg">
            Loss: {formatCurrency(largestLoss)}
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
            <div className="text-center text-[#16A34A] font-medium">
              {formatCurrency(largestGain)}
            </div>
            <div className="text-center text-[#DC2626] font-medium">
              {formatCurrency(largestLoss)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}