'use client';

import { useState, useEffect } from 'react';
import { Trade, TradeFilters } from '@/types';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';
import { useAuth } from '@/contexts/AuthContext';

interface TradesData {
  trades: Trade[];
  count?: number;
  totalPnl: number;
  totalVolume: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseTradesDataOptions {
  useComplexFiltering?: boolean;
  page?: number;
  limit?: number;
}

export function useTradesData(
  options: UseTradesDataOptions = {}
) {
  const [data, setData] = useState<TradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { useComplexFiltering = false, page = 1, limit = 50 } = options;
  const { toFilterOptions, hasAdvancedFilters } = useGlobalFilters();
  const { isDemo } = useAuth();
  
  // Automatically use complex filtering if advanced filters are active
  const shouldUseComplexFiltering = useComplexFiltering || hasAdvancedFilters;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const filters = toFilterOptions();

        if (shouldUseComplexFiltering) {
          // Use the new filtered endpoint for complex filtering
          const tradeFilters: TradeFilters = {
            symbols: filters.symbol && filters.symbol !== 'Symbol' ? [filters.symbol] : undefined,
            tags: filters.tags?.length ? filters.tags : undefined,
            side: filters.side,
            duration: filters.duration,
            showOpenTrades: filters.showOpenTrades,
            priceRange: filters.priceRange,
            volumeRange: filters.volumeRange,
            executionCountRange: filters.executionCountRange,
            timeRange: filters.timeRange,
            dateRange: (filters.dateFrom || filters.dateTo) ? {
              start: filters.dateFrom ? new Date(filters.dateFrom) : new Date('1900-01-01'),
              end: filters.dateTo ? new Date(filters.dateTo) : new Date()
            } : undefined
          };

          const response = await fetch('/api/trades/filtered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: tradeFilters,
              page,
              limit,
              demo: isDemo
            })
          });

          if (!response.ok) {
            throw new Error('Failed to fetch filtered trades data');
          }
          
          const result = await response.json();
          setData({
            trades: result.trades,
            count: result.pagination?.total,
            totalPnl: result.totalPnl,
            totalVolume: result.totalVolume,
            pagination: result.pagination
          });
        } else {
          // Use the original simple filtering endpoint
          const params = new URLSearchParams();
          if (filters.symbol) params.append('symbol', filters.symbol);
          if (filters.side) params.append('side', filters.side);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.tags?.length) params.append('tags', filters.tags.join(','));
          if (filters.duration) params.append('duration', filters.duration);
          if (filters.showOpenTrades) params.append('showOpenTrades', 'true');
          if (isDemo) params.append('demo', 'true');
          
          const response = await fetch(`/api/trades?${params}`);
          if (!response.ok) {
            throw new Error('Failed to fetch trades data');
          }
          const result = await response.json();
          setData({
            trades: result.trades,
            count: result.count,
            totalPnl: result.totalPnl,
            totalVolume: result.totalVolume
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toFilterOptions, isDemo, shouldUseComplexFiltering, page, limit]);

  const addTrade = async (tradeData: Partial<Trade>) => {
    if (isDemo) {
      throw new Error('Cannot add trades in demo mode');
    }
    
    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add trade');
      }
      
      const newTrade = await response.json();
      
      // Update local state
      if (data) {
        setData({
          ...data,
          trades: [...data.trades, newTrade],
          count: (data.count || 0) + 1,
          totalPnl: data.totalPnl + (newTrade.pnl || 0),
          totalVolume: data.totalVolume + (newTrade.volume || 0)
        });
      }
      
      return newTrade;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add trade');
      throw err;
    }
  };

  const refetch = () => {
    setError(null);
    setLoading(true);
    
    const filters = toFilterOptions();
    const params = new URLSearchParams();
    if (filters.symbol) params.append('symbol', filters.symbol);
    if (filters.side) params.append('side', filters.side);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    if (isDemo) params.append('demo', 'true');
    
    fetch(`/api/trades?${params}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  return {
    data,
    loading,
    error,
    refetch,
    addTrade
  };
}