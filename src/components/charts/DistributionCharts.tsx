'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DistributionData } from '@/types';

interface DistributionChartsProps {
  data: DistributionData[];
  title: string;
  height?: number;
  showValues?: boolean;
}

export default function DistributionCharts({ 
  data, 
  title, 
  height = 120,
  showValues = true 
}: DistributionChartsProps) {
  const getBarColor = (value: number) => {
    return value >= 0 ? '#16A34A' : '#DC2626';
  };

  const formatValue = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            {/* Range Label */}
            <div className="flex-shrink-0 w-24 text-xs text-muted">
              {item.range}
            </div>
            
            {/* Progress Bar */}
            <div className="flex-1 mx-3">
              <div className="relative h-4 bg-gray-100 rounded-sm overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full transition-all duration-300"
                  style={{ 
                    width: `${Math.abs(item.percentage)}%`,
                    backgroundColor: getBarColor(item.value)
                  }}
                />
              </div>
            </div>
            
            {/* Value and Percentage */}
            <div className="flex-shrink-0 text-right space-y-0.5">
              <div className={`text-sm font-medium ${item.value >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatValue(item.value)}
              </div>
              <div className="text-xs text-muted">
                {formatPercentage(item.percentage)}
              </div>
            </div>
          </div>
        ))}
        
        {/* Mini Chart */}
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis hide />
              <YAxis hide />
              <Bar dataKey="value" radius={[1, 1, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Gauge Chart Component for MFE/MAE ratios
interface GaugeChartProps {
  value: number;
  max: number;
  title: string;
  height?: number;
  color?: string;
}

export function GaugeChart({ 
  value, 
  max, 
  title, 
  height = 120,
  color = '#16A34A' 
}: GaugeChartProps) {
  const percentage = (Math.abs(value) / max) * 100;
  const isPositive = value >= 0;
  
  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Semi-circular gauge */}
        <div className="relative" style={{ width: '120px', height: '60px' }}>
          <svg viewBox="0 0 120 60" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 50 A 40 40 0 0 1 110 50"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d={`M 10 50 A 40 40 0 0 1 ${Math.round((10 + (percentage / 100) * 100) * 1000) / 1000} ${Math.round((50 - Math.sin((percentage / 100) * Math.PI) * 40) * 1000) / 1000}`}
              fill="none"
              stroke={isPositive ? '#16A34A' : '#DC2626'}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          {/* Center value */}
          <div className="absolute inset-0 flex items-end justify-center pb-2">
            <div className={`text-lg font-bold ${isPositive ? 'text-positive' : 'text-negative'}`}>
              ${Math.abs(value).toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}