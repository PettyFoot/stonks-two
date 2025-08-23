'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading chart...</div>
});

interface ChartData {
  daily: Array<{ day: number; pnl: number; trades: number }>;
  monthly: Array<{ month: number; monthName: string; pnl: number; trades: number }>;
  yearly: Array<{ year: number; pnl: number; trades: number }>;
}

export default function CalendarSummaryCharts() {
  const [timeframe, setTimeframe] = useState<'month' | 'year' | 'all'>('all');
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSummaryData();
  }, [timeframe]);

  const fetchSummaryData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/summary?timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-64">Loading charts...</div>;
  }

  // Chart configuration
  const getChartOptions = (title: string, categories: (string | number)[]): ApexOptions => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: categories.map(c => c.toString()),
      labels: {
        style: {
          colors: '#94a3b8'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#94a3b8'
        },
        formatter: (value) => `$${value.toFixed(0)}`
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
    },
    theme: {
      mode: 'dark'
    },
    colors: ['#16A34A'],
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (value) => `$${value.toFixed(2)}`
      }
    },
    title: {
      text: title,
      style: {
        color: '#e2e8f0',
        fontSize: '14px',
        fontWeight: 600
      }
    }
  });

  // Prepare chart data
  const dayCategories = Array.from({ length: 31 }, (_, i) => i + 1);
  const dayPnlData = dayCategories.map(day => {
    const dayData = data.daily.find(d => d.day === day);
    return dayData?.pnl || 0;
  });
  const dayTradeData = dayCategories.map(day => {
    const dayData = data.daily.find(d => d.day === day);
    return dayData?.trades || 0;
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthPnlData = monthNames.map((_, i) => {
    const monthData = data.monthly.find(m => m.month === i + 1);
    return monthData?.pnl || 0;
  });
  const monthTradeData = monthNames.map((_, i) => {
    const monthData = data.monthly.find(m => m.month === i + 1);
    return monthData?.trades || 0;
  });

  const yearCategories = data.yearly.map(y => y.year);
  const yearPnlData = data.yearly.map(y => y.pnl);
  const yearTradeData = data.yearly.map(y => y.trades);

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex justify-end">
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts Grid - Exact order as specified */}
      <div className="space-y-6">
        {/* Row 1: Day of Month Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <Chart
                options={getChartOptions('PERFORMANCE BY DAY OF MONTH', dayCategories)}
                series={[{ name: 'P&L', data: dayPnlData }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <Chart
                options={{
                  ...getChartOptions('TRADE DISTRIBUTION BY DAY', dayCategories),
                  yaxis: {
                    ...getChartOptions('', []).yaxis,
                    labels: {
                      style: { colors: '#94a3b8' },
                      formatter: (value) => value.toString()
                    }
                  },
                  tooltip: {
                    theme: 'dark',
                    y: {
                      formatter: (value) => `${value} trades`
                    }
                  }
                }}
                series={[{ name: 'Trades', data: dayTradeData }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Month of Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <Chart
                options={getChartOptions('PERFORMANCE BY MONTH', monthNames)}
                series={[{ name: 'P&L', data: monthPnlData }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <Chart
                options={{
                  ...getChartOptions('TRADE DISTRIBUTION BY MONTH', monthNames),
                  yaxis: {
                    ...getChartOptions('', []).yaxis,
                    labels: {
                      style: { colors: '#94a3b8' },
                      formatter: (value) => value.toString()
                    }
                  },
                  tooltip: {
                    theme: 'dark',
                    y: {
                      formatter: (value) => `${value} trades`
                    }
                  }
                }}
                series={[{ name: 'Trades', data: monthTradeData }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <Chart
                options={getChartOptions('PERFORMANCE BY YEAR', yearCategories)}
                series={[{ name: 'P&L', data: yearPnlData }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardContent className="p-4">
              <Chart
                options={{
                  ...getChartOptions('TRADE DISTRIBUTION BY YEAR', yearCategories),
                  yaxis: {
                    ...getChartOptions('', []).yaxis,
                    labels: {
                      style: { colors: '#94a3b8' },
                      formatter: (value) => value.toString()
                    }
                  },
                  tooltip: {
                    theme: 'dark',
                    y: {
                      formatter: (value) => `${value} trades`
                    }
                  }
                }}
                series={[{ name: 'Trades', data: yearTradeData }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}