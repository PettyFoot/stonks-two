'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_HEIGHTS } from '@/constants/chartHeights';

interface BarData {
  label: string;
  value: number;
  color: string;
  displayValue?: string; // Optional formatted value for display
}

interface HorizontalBarChartProps {
  title: string;
  data: BarData[];
  formatter?: (value: number) => string;
  height?: number;
  showValues?: boolean;
}

export default function HorizontalBarChart({ 
  title, 
  data, 
  formatter,
  height = CHART_HEIGHTS.XS,
  showValues = true 
}: HorizontalBarChartProps) {
  // Find the maximum value for scaling
  const maxValue = Math.max(...data.map(item => Math.abs(item.value)), 1);
  
  // Format value for display
  const formatValue = (item: BarData) => {
    if (item.displayValue) return item.displayValue;
    if (formatter) return formatter(item.value);
    return item.value.toFixed(2);
  };

  return (
    <Card className="bg-surface border-default overflow-hidden" style={{ height }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent style={{ height: `calc(100% - 52px)`, padding: '0.75rem 1rem' }}>
        <div className="h-full flex flex-col justify-center gap-3">
          {data.map((item, index) => {
            // Calculate percentage, ensuring minimum visibility
            const percentage = Math.max((Math.abs(item.value) / maxValue) * 100, 2);
            
            return (
              <div key={index} className="flex items-center gap-3">
                {/* Label */}
                <span className="text-xs text-muted font-medium min-w-[60px]">
                  {item.label}
                </span>
                
                {/* Bar container */}
                <div className="flex-1">
                  <div className="w-full h-6 rounded-sm overflow-hidden" style={{backgroundColor: 'var(--theme-chart-grid)'}}>
                    <div
                      className="h-full transition-all duration-500 ease-out rounded-sm flex items-center"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                        minWidth: item.value !== 0 ? '2px' : '0'
                      }}
                    >
                      {/* Value inside bar if there's space */}
                      {percentage > 30 && showValues && (
                        <span className="text-xs text-white font-semibold px-2">
                          {formatValue(item)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Value outside if not enough space in bar */}
                {(percentage <= 30 || !showValues) && showValues && (
                  <span className="text-xs font-semibold min-w-[60px] text-right" style={{ color: item.color }}>
                    {formatValue(item)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper formatters
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

export const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = absValue.toFixed(2);
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
};