'use client';

import { useState, useEffect } from 'react';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';
import { useAuth } from '@/contexts/AuthContext';

interface DailyPnlData {
  date: string;
  pnl: number;
  trades: number;
  volume: number;
  winRate: number;
}

interface ReportsData {
  dailyPnl: DailyPnlData[];
  averageDailyPnl: number;
  averageDailyPnlOnTradingDays: number;
  averageDailyVolume: number;
  averageDailyVolumeOnTradingDays: number;
  cumulativePnl: { date: string; value: number }[];
  winPercentage: number;
  totalVolume: number;
  daysDiff: number;
  tradingDaysCount: number;
  loading: boolean;
  error: string | null;
}

export function useReportsData() {
  const { toFilterOptions } = useGlobalFilters();
  const { isDemo } = useAuth();
  const [data, setData] = useState<ReportsData>({
    dailyPnl: [],
    averageDailyPnl: 0,
    averageDailyPnlOnTradingDays: 0,
    averageDailyVolume: 0,
    averageDailyVolumeOnTradingDays: 0,
    cumulativePnl: [],
    winPercentage: 0,
    totalVolume: 0,
    daysDiff: 1,
    tradingDaysCount: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    async function fetchReportsData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        const filters = toFilterOptions();
        const params = new URLSearchParams();
        
        // Add filter parameters
        if (filters.dateFrom) params.append('from', filters.dateFrom);
        if (filters.dateTo) params.append('to', filters.dateTo);
        if (filters.symbol) params.append('symbol', filters.symbol);
        if (filters.side && filters.side !== 'all') params.append('side', filters.side);
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
        if (filters.duration && filters.duration !== 'all') params.append('duration', filters.duration);
        if (isDemo) params.append('demo', 'true');

        const response = await fetch(`/api/reports/overview?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch reports data');
        }

        const result = await response.json();
        
        setData({
          dailyPnl: result.dailyPnl || [],
          averageDailyPnl: result.averageDailyPnl || 0,
          averageDailyPnlOnTradingDays: result.averageDailyPnlOnTradingDays || 0,
          averageDailyVolume: result.averageDailyVolume || 0,
          averageDailyVolumeOnTradingDays: result.averageDailyVolumeOnTradingDays || 0,
          cumulativePnl: result.cumulativePnl || [],
          winPercentage: result.winPercentage || 0,
          totalVolume: result.totalVolume || 0,
          daysDiff: result.daysDiff || 1,
          tradingDaysCount: result.tradingDaysCount || 0,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching reports data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch reports data'
        }));
      }
    }

    fetchReportsData();
  }, [toFilterOptions, isDemo]);

  return data;
}