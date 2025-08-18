'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomBarChart from '@/components/charts/BarChart';
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
      return '#16A34A'; // Green for distribution charts
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

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={containerClass}>
        <div style={contentStyle}>
          {data && data.length > 0 ? (
            <CustomBarChart
              data={data}
              title=""
              height={height}
              chartType={valueType}
              color={getChartColor()}
              useConditionalColors={chartType === 'performance'}
              showGrid={true}
              showTooltip={true}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}