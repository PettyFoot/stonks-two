'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface GaugeChartProps {
  title: string;
  value: number;
  maxValue?: number;
  suffix?: string;
  height?: number;
  color?: string;
  showValue?: boolean;
}

export default function GaugeChart({ 
  title, 
  value, 
  maxValue = 100, 
  suffix = '%',
  height = 180,
  color,
  showValue = true
}: GaugeChartProps) {
  // Calculate percentage for the gauge
  const clampedValue = Math.max(0, Math.min(Math.abs(value), maxValue));
  const percentage = maxValue > 0 ? (clampedValue / maxValue) * 100 : 0;
  
  // Determine color based on value or use provided color
  const getColor = () => {
    if (color) return color;
    if (suffix === '%') {
      return value >= 50 ? 'var(--theme-green)' : 'var(--theme-red)';
    }
    return value >= 1 ? 'var(--theme-green)' : 'var(--theme-red)';
  };
  
  const gaugeColor = getColor();
  
  // Data for PieChart - value portion and remaining portion
  const data = [
    {
      name: 'value',
      value: percentage,
      fill: gaugeColor
    },
    {
      name: 'remaining',
      value: 100 - percentage,
      fill: 'var(--theme-chart-grid)'
    }
  ];
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { name?: string }; value?: number }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      // Only show tooltip for the value portion (not the remaining/background)
      if (data.payload?.name === 'value') {
        return (
          <div className="text-xs rounded px-2 py-1 shadow-lg" style={{backgroundColor: 'var(--theme-chart-tooltip-bg)', color: 'var(--theme-primary-text)'}}>
            {suffix === '%' ? value.toFixed(1) : value.toFixed(2)}{suffix}
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
          
          {/* Value display */}
          {showValue && (
            <div className="text-center">
              <div 
                className="text-2xl font-bold" 
                style={{ color: gaugeColor }}
              >
                {suffix === '%' ? value.toFixed(1) : value.toFixed(2)}{suffix}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}