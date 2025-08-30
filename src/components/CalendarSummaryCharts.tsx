'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
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

const CalendarSummaryCharts = memo(function CalendarSummaryCharts() {
  const [timeframe, setTimeframe] = useState<'month' | 'year' | 'all'>('all');
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummaryData = useCallback(async () => {
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
  }, [timeframe]);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  if (isLoading || !data || !chartData) {
    return <div className="flex items-center justify-center h-64">Loading charts...</div>;
  }

  // Memoize chart configuration factory to prevent recreation
  const getChartOptions = useMemo(() => {
    return (title: string, categories: (string | number)[]): ApexOptions => ({
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
            colors: 'var(--theme-secondary-text)'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--theme-secondary-text)'
          },
          formatter: (value) => `$${value.toFixed(0)}`
        }
      },
      grid: {
        borderColor: 'var(--theme-chart-grid)',
        strokeDashArray: 4,
      },
      theme: {
        mode: 'dark'
      },
      colors: ['var(--theme-green)'],
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => `$${value.toFixed(2)}`
        }
      },
      title: {
        text: title,
        style: {
          color: 'var(--theme-primary-text)',
          fontSize: '14px',
          fontWeight: 600
        }
      }
    });
  }, []);

  // Memoize chart data preparation to prevent recalculation on every render
  const chartData = useMemo(() => {
    if (!data) return null;
    
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
    
    return {
      dayCategories,
      dayPnlData,
      dayTradeData,
      monthNames,
      monthPnlData,
      monthTradeData,
      yearCategories,
      yearPnlData,
      yearTradeData
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex justify-end">
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as 'month' | 'year' | 'all')}>
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
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <Chart
                options={getChartOptions('PERFORMANCE BY DAY OF MONTH', chartData?.dayCategories || [])}
                series={[{ name: 'P&L', data: chartData?.dayPnlData || [] }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>

          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <Chart
                options={{
                  ...getChartOptions('TRADE DISTRIBUTION BY DAY', chartData?.dayCategories || []),
                  yaxis: {
                    ...getChartOptions('', []).yaxis,
                    labels: {
                      style: { colors: 'var(--theme-secondary-text)' },
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
                series={[{ name: 'Trades', data: chartData?.dayTradeData || [] }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Month of Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <Chart
                options={getChartOptions('PERFORMANCE BY MONTH', chartData?.monthNames || [])}
                series={[{ name: 'P&L', data: chartData?.monthPnlData || [] }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>

          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <Chart
                options={{
                  ...getChartOptions('TRADE DISTRIBUTION BY MONTH', chartData?.monthNames || []),
                  yaxis: {
                    ...getChartOptions('', []).yaxis,
                    labels: {
                      style: { colors: 'var(--theme-secondary-text)' },
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
                series={[{ name: 'Trades', data: chartData?.monthTradeData || [] }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Year Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <Chart
                options={getChartOptions('PERFORMANCE BY YEAR', chartData?.yearCategories || [])}
                series={[{ name: 'P&L', data: chartData?.yearPnlData || [] }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>

          <Card className="bg-surface border-default">
            <CardContent className="p-4">
              <Chart
                options={{
                  ...getChartOptions('TRADE DISTRIBUTION BY YEAR', chartData?.yearCategories || []),
                  yaxis: {
                    ...getChartOptions('', []).yaxis,
                    labels: {
                      style: { colors: 'var(--theme-secondary-text)' },
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
                series={[{ name: 'Trades', data: chartData?.yearTradeData || [] }]}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default CalendarSummaryCharts;