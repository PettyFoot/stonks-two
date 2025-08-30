'use client';

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DistributionData } from '@/types';
import { CHART_HEIGHTS } from '@/constants/chartHeights';

interface DistributionChartsProps {
  data: DistributionData[];
  title: string;
  height?: number;
  showValues?: boolean;
}

export default function DistributionCharts({ 
  data, 
  title,
  height = CHART_HEIGHTS.SM
}: DistributionChartsProps) {
  const getBarColor = (value: number) => {
    return value >= 0 ? 'var(--theme-green)' : 'var(--theme-red)';
  };

  const formatValue = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  // Calculate maximum value for scaling bar widths
  const maxValue = Math.max(...data.map(item => Math.abs(item.value ?? item.pnl ?? 0)), 1);
  
  // Calculate bar width based on value relative to max
  const calculateBarWidth = (value: number) => {
    if (value === 0) return 100; // Full width grey background for zero values
    const rawPercentage = (Math.abs(value) / maxValue) * 100;
    return Math.max(rawPercentage, 5); // Minimum 5% width for visibility
  };

  return (
    <Card className="bg-surface border-default overflow-hidden" style={{ height }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto overflow-x-hidden flex items-center" style={{ height: `calc(100% - 60px)` }}>
        <div className="space-y-3 w-full">
          {data.map((item, index) => (
            <div key={index} className={`flex items-center gap-2 ${index === 0 ? 'mt-6' : ''}`}>
              {/* Range Label */}
              <div className="flex-shrink-0 w-12 text-xs text-muted">
                {item.range || item.category}
              </div>
              
              {/* Progress Bar */}
              <div className="flex-1 min-w-0">
                <div className="relative h-4 w-full">
                  {(item.value ?? item.pnl ?? 0) === 0 ? (
                    /* Grey background bar for zero values */
                    <div 
                      className="h-full w-full rounded-sm transition-all duration-300"
                      style={{ 
                        backgroundColor: 'var(--theme-chart-grid)'
                      }}
                    />
                  ) : (
                    /* Colored bar for non-zero values */
                    <div 
                      className="h-full rounded-sm transition-all duration-300"
                      style={{ 
                        width: `${calculateBarWidth(item.value ?? item.pnl ?? 0)}%`,
                        backgroundColor: getBarColor(item.value ?? item.pnl ?? 0)
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Value and Percentage */}
              <div className="flex-shrink-0 text-right">
                <div className={`text-xs font-medium ${(item.value ?? item.pnl ?? 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatValue(item.value ?? item.pnl ?? 0)}
                </div>
                <div className="text-xs text-muted">
                  {formatPercentage(item.percentage)}
                </div>
              </div>
            </div>
          ))}
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

export const GaugeChart = memo(function GaugeChart({ 
  value, 
  max, 
  title
}: GaugeChartProps) {
  // Memoize gauge calculations
  const gaugeData = useMemo(() => ({
    percentage: (Math.abs(value) / max) * 100,
    isPositive: value >= 0
  }), [value, max]);
  
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
              stroke="var(--theme-chart-grid)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d={`M 10 50 A 40 40 0 0 1 ${Math.round((10 + (gaugeData.percentage / 100) * 100) * 1000) / 1000} ${Math.round((50 - Math.sin((gaugeData.percentage / 100) * Math.PI) * 40) * 1000) / 1000}`}
              fill="none"
              stroke={gaugeData.isPositive ? 'var(--theme-green)' : 'var(--theme-red)'}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          {/* Center value */}
          <div className="absolute inset-0 flex items-end justify-center pb-2">
            <div className={`text-lg font-bold ${gaugeData.isPositive ? 'text-positive' : 'text-negative'}`}>
              ${Math.abs(value).toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});