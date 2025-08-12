'use client';

import { useState, useEffect } from 'react';
import { Trade, FilterOptions } from '@/types';

interface TradesData {
  trades: Trade[];
  count: number;
  totalPnl: number;
  totalVolume: number;
}

export function useTradesData(filters: FilterOptions = {}) {
  const [data, setData] = useState<TradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Build query params from filters
        const params = new URLSearchParams();
        if (filters.symbol) params.append('symbol', filters.symbol);
        if (filters.side) params.append('side', filters.side);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
        
        const response = await fetch(`/api/trades?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trades data');
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
  }, [filters]);

  const addTrade = async (tradeData: Partial<Trade>) => {
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
          count: data.count + 1,
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
    
    const params = new URLSearchParams();
    if (filters.symbol) params.append('symbol', filters.symbol);
    if (filters.side) params.append('side', filters.side);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    
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