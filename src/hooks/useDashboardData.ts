'use client';

import { useState, useEffect } from 'react';
import { DayData, KPIData, ChartDataPoint } from '@/types';

interface DashboardData {
  dayData: DayData[];
  kpiData: KPIData;
  cumulativePnl: ChartDataPoint[];
  summary: {
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    bestDay: number;
    worstDay: number;
  };
}

export function useDashboardData(dateRange: string = '30', demo: boolean = false) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ range: dateRange });
        if (demo) {
          params.append('demo', 'true');
        }
        
        const response = await fetch(`/api/dashboard?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange, demo]);

  const refetch = () => {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams({ range: dateRange });
    if (demo) {
      params.append('demo', 'true');
    }
    
    fetch(`/api/dashboard?${params.toString()}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}