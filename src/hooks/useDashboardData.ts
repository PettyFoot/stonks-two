'use client';

import { useState, useEffect } from 'react';
import { DayData, KPIData, ChartDataPoint } from '@/types';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';
import { useAuth } from '@/contexts/AuthContext';

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

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toFilterOptions } = useGlobalFilters();
  const { isDemo, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Don't fetch data until auth state is resolved
    if (authLoading) {
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const filterOptions = toFilterOptions();
        const params = new URLSearchParams();
        
        // Pass ALL filter parameters to the API
        if (filterOptions.dateFrom) params.append('dateFrom', filterOptions.dateFrom);
        if (filterOptions.dateTo) params.append('dateTo', filterOptions.dateTo);
        if (filterOptions.symbol) params.append('symbol', filterOptions.symbol);
        if (filterOptions.side) params.append('side', filterOptions.side);
        if (filterOptions.tags && filterOptions.tags.length > 0) {
          params.append('tags', filterOptions.tags.join(','));
        }
        if (filterOptions.duration) params.append('duration', filterOptions.duration);
        if (filterOptions.showOpenTrades !== undefined) {
          params.append('showOpenTrades', filterOptions.showOpenTrades.toString());
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
  }, [toFilterOptions, isDemo, authLoading]);

  const refetch = () => {
    setError(null);
    setLoading(true);
    const filterOptions = toFilterOptions();
    const params = new URLSearchParams();
    
    // Pass ALL filter parameters to the API
    if (filterOptions.dateFrom) params.append('dateFrom', filterOptions.dateFrom);
    if (filterOptions.dateTo) params.append('dateTo', filterOptions.dateTo);
    if (filterOptions.symbol) params.append('symbol', filterOptions.symbol);
    if (filterOptions.side) params.append('side', filterOptions.side);
    if (filterOptions.tags && filterOptions.tags.length > 0) {
      params.append('tags', filterOptions.tags.join(','));
    }
    if (filterOptions.duration) params.append('duration', filterOptions.duration);
    if (filterOptions.showOpenTrades !== undefined) {
      params.append('showOpenTrades', filterOptions.showOpenTrades.toString());
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