'use client';

import React from 'react';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import { AnalyticsTabContentProps } from '../AnalyticsTabsSection';

export default function DaysTimesTab({ data }: AnalyticsTabContentProps) {
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
          <TradeDistributionChart
            data={data.performance.byMonth}
            title="PERFORMANCE BY MONTH OF YEAR"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
            conditionalColors={true}
            chartType="currency"
            showReferenceLine={true}
          />
        </div>

        {/* Duration Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byDuration}
            title="TRADE DISTRIBUTION BY DURATION"
            orientation="horizontal"
          />
          <TradeDistributionChart
            data={data.performance.byDuration}
            title="PERFORMANCE BY DURATION"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
            conditionalColors={true}
            chartType="currency"
            showReferenceLine={true}
          />
        </div>

        {/* Intraday Duration Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byIntradayDuration}
            title="TRADE DISTRIBUTION BY INTRADAY DURATION"
            orientation="horizontal"
          />
          <TradeDistributionChart
            data={data.performance.byIntradayDuration}
            title="PERFORMANCE BY INTRADAY DURATION"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
            conditionalColors={true}
            chartType="currency"
            showReferenceLine={true}
          />
        </div>

        {/* Day of Week Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byDayOfWeek}
            title="TRADE DISTRIBUTION BY DAY OF WEEK"
            orientation="horizontal"
          />
          <TradeDistributionChart
            data={data.performance.byDayOfWeek}
            title="PERFORMANCE BY DAY OF WEEK"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
            conditionalColors={true}
            chartType="currency"
            showReferenceLine={true}
          />
        </div>

        {/* Hour Analysis */}
        <div className="grid grid-cols-2 gap-6">
          <TradeDistributionChart
            data={data.distribution.byHourOfDay}
            title="TRADE DISTRIBUTION BY HOUR OF DAY"
          />
          <TradeDistributionChart
            data={data.performance.byHourOfDay}
            title="PERFORMANCE BY HOUR OF DAY"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
            conditionalColors={true}
            chartType="currency"
            showReferenceLine={true}
          />
        </div>
      </div>
    </div>
  );
}