'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  height = 120,
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
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ minHeight: height }}>
          {data.map((item, index) => {
            const percentage = (Math.abs(item.value) / maxValue) * 100;
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted font-medium">{item.label}</span>
                  {showValues && (
                    <span className="font-semibold" style={{ color: item.color }}>
                      {formatValue(item)}
                    </span>
                  )}
                </div>
                <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 ease-out rounded"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
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