'use client';

import { useState, useEffect } from 'react';
import { DayData, KPIData, ChartDataPoint } from '@/types';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';

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

export function useDashboardData(demo: boolean = false) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toFilterOptions } = useGlobalFilters();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const filterOptions = toFilterOptions();
        const params = new URLSearchParams();
        
        // Use date range from global filters
        if (filterOptions.dateFrom) params.append('dateFrom', filterOptions.dateFrom);
        if (filterOptions.dateTo) params.append('dateTo', filterOptions.dateTo);
        if (demo) params.append('demo', 'true');
        
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
  }, [toFilterOptions, demo]);

  const refetch = () => {
    setError(null);
    setLoading(true);
    const filterOptions = toFilterOptions();
    const params = new URLSearchParams();
    
    if (filterOptions.dateFrom) params.append('dateFrom', filterOptions.dateFrom);
    if (filterOptions.dateTo) params.append('dateTo', filterOptions.dateTo);
    if (demo) params.append('demo', 'true');
    
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