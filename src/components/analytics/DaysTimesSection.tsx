'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TradeDistributionChart from '@/components/charts/TradeDistributionChart';
import ConditionalBarChart from '@/components/charts/ConditionalBarChart';
import { AnalyticsData } from '@/types';

interface DaysTimesSectionProps {
  data: AnalyticsData;
}

export default function DaysTimesSection({ data }: DaysTimesSectionProps) {
  const [timeframe, setTimeframe] = useState('1 hour');

  // Available tabs based on the screenshots
  const tabs = [
    { value: 'days-times', label: 'Days/Times', active: true },
    { value: 'price-volume', label: 'Price/Volume', active: false },
    { value: 'win-loss', label: 'Win/Loss/Expectation', active: true },
    { value: 'liquidity', label: 'Liquidity', active: false },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              tab.value === 'days-times' || tab.value === 'win-loss'
                ? 'bg-theme-primary text-white'
                : 'bg-theme-surface text-theme-secondary-text hover:bg-theme-surface/80'
            }`}
            disabled={!tab.active}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Days/Times Content */}
      <Tabs defaultValue="month" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-5 w-fit">
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="duration">Duration</TabsTrigger>
            <TabsTrigger value="intraday">Intraday Duration</TabsTrigger>
            <TabsTrigger value="day-of-week">Day of Week</TabsTrigger>
            <TabsTrigger value="hour">Hour</TabsTrigger>
          </TabsList>
          
          {/* Timeframe selector - only show for hour tab */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-theme-primary-text">TIMEFRAME:</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 hour">1 hour</SelectItem>
                <SelectItem value="30 min">30 min</SelectItem>
                <SelectItem value="15 min">15 min</SelectItem>
                <SelectItem value="5 min">5 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Month Tab */}
        <TabsContent value="month" className="space-y-6">
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
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="space-y-6">
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
        </TabsContent>

        {/* Intraday Duration Tab */}
        <TabsContent value="intraday" className="space-y-6">
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
        </TabsContent>

        {/* Day of Week Tab */}
        <TabsContent value="day-of-week" className="space-y-6">
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
        </TabsContent>

        {/* Hour Tab */}
        <TabsContent value="hour" className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}