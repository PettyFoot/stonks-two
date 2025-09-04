'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import { ChartDataPoint } from '@/types';
import { ChartType } from '@/lib/chartFormatters';

interface ChartContainerProps {
  title: string;
  data: ChartDataPoint[];
  chartType?: 'distribution' | 'performance';
  valueType?: ChartType;
  height?: number;
  minWidth?: number;
  enableScroll?: boolean;
}

export default function ChartContainer({
  title,
  data,
  chartType = 'distribution',
  valueType = 'shares',
  height = 300,
  minWidth = 400,
  enableScroll = true
}: ChartContainerProps) {
  
  // Determine chart colors based on type
  const getChartColor = () => {
    if (chartType === 'distribution') {
      return 'var(--theme-green)'; // Green for distribution charts
    }
    return undefined; // Let BarChart handle conditional colors for performance
  };

  // Frontend Engineer Review Point: Horizontal scroll implementation
  const containerClass = enableScroll 
    ? 'overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100'
    : '';

  const contentStyle = enableScroll 
    ? { minWidth: `${minWidth}px` }
    : {};

  // Check if there's any actual data (not just 0 values)
  const hasData = data && data.length > 0 && data.some(item => item.value !== 0);

  return (
    <Card className="bg-theme-surface border-theme-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-theme-primary-text">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={containerClass}>
        <div style={contentStyle}>
          {hasData ? (
            <TradeDistributionChart
              data={data}
              title=""
              height={height}
              chartType={valueType}
              color={getChartColor()}
              conditionalColors={chartType === 'performance'}
              showGrid={true}
              showTooltip={true}
              showReferenceLine={chartType === 'performance'}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-theme-secondary-text">
              No data available for the selected period
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}