'use client';

import React from 'react';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import ConditionalBarChart from '@/components/charts/ConditionalBarChart';
import { AnalyticsTabContentProps } from '../AnalyticsTabsSection';

export default function DaysTimesTab({ data, context }: AnalyticsTabContentProps) {
  return (
    <div className="space-y-8">
      {/* Days/Times Analytics */}
      <div className="space-y-8">
        {/* Month Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byMonth}
            title="TRADE DISTRIBUTION BY MONTH OF YEAR"
            orientation="horizontal"
          />
          <ConditionalBarChart
            data={data.performance.byMonth}
            title="PERFORMANCE BY MONTH OF YEAR"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
          />
        </div>

        {/* Duration Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byDuration}
            title="TRADE DISTRIBUTION BY DURATION"
            orientation="horizontal"
          />
          <ConditionalBarChart
            data={data.performance.byDuration}
            title="PERFORMANCE BY DURATION"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
          />
        </div>

        {/* Intraday Duration Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byIntradayDuration}
            title="TRADE DISTRIBUTION BY INTRADAY DURATION"
            orientation="horizontal"
          />
          <ConditionalBarChart
            data={data.performance.byIntradayDuration}
            title="PERFORMANCE BY INTRADAY DURATION"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
          />
        </div>

        {/* Day of Week Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byDayOfWeek}
            title="TRADE DISTRIBUTION BY DAY OF WEEK"
            orientation="horizontal"
          />
          <ConditionalBarChart
            data={data.performance.byDayOfWeek}
            title="PERFORMANCE BY DAY OF WEEK"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
          />
        </div>

        {/* Hour Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byHourOfDay}
            title="TRADE DISTRIBUTION BY HOUR OF DAY"
          />
          <ConditionalBarChart
            data={data.performance.byHourOfDay}
            title="PERFORMANCE BY HOUR OF DAY"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
          />
        </div>
      </div>
    </div>
  );
}