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
  const { isDemo, isLoading: authLoading, user } = useAuth();
  const [previousDemo, setPreviousDemo] = useState<boolean | null>(null);
  
  // Automatically use complex filtering if advanced filters are active
  const shouldUseComplexFiltering = useComplexFiltering || hasAdvancedFilters;
  
  // Clear data when transitioning from demo to authenticated user
  useEffect(() => {
    if (previousDemo === true && isDemo === false && user && !authLoading) {
      console.log('useTradesData: Detected demo to auth transition, clearing data');
      setData(null);
      setError(null);
      // Force a fresh fetch by not setting loading to false here
    }
    setPreviousDemo(isDemo);
  }, [isDemo, user, authLoading, previousDemo]);

  // Validate data matches current user context
  useEffect(() => {
    if (data && user && !isDemo) {
      // If we have data but the user is no longer demo, ensure this isn't stale demo data
      const currentUserId = user.id;
      if (currentUserId === 'demo-user-001') {
        console.warn('useTradesData: Detected stale demo data for authenticated user, clearing');
        setData(null);
        setError(null);
      }
    }
  }, [data, user, isDemo]);

  useEffect(() => {
    // Don't fetch data until auth state is resolved
    if (authLoading) {
      return;
    }

    async function fetchData(retryCount = 0) {
      const maxRetries = 3;
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      
      try {
        setLoading(true);
        setError(null);
        
        const filters = toFilterOptions();
        
        console.log('=== useTradesData FETCH START ===');
        console.log('Demo mode:', isDemo);
        console.log('Filters:', filters);
        console.log('Should use complex filtering:', shouldUseComplexFiltering);

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

          console.log('Using FILTERED endpoint with tradeFilters:', tradeFilters);
          console.log('Request payload:', { filters: tradeFilters, page, limit, demo: isDemo });

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

          console.log('Filtered API response status:', response.status);

          if (!response.ok) {
            // If it's a 401 error and we haven't exceeded max retries, retry after delay
            if (response.status === 401 && retryCount < maxRetries) {
              console.log(`Trades filtered API authentication failed, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
              setTimeout(() => {
                fetchData(retryCount + 1);
              }, retryDelay);
              return;
            }
            throw new Error('Failed to fetch filtered trades data');
          }
          
          const result = await response.json();
          console.log('Filtered API raw result:', result);
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
          
          console.log('Using SIMPLE endpoint with params:', params.toString());
          
          const response = await fetch(`/api/trades?${params}`);
          console.log('Simple API response status:', response.status);
          
          if (!response.ok) {
            // If it's a 401 error and we haven't exceeded max retries, retry after delay
            if (response.status === 401 && retryCount < maxRetries) {
              console.log(`Trades API authentication failed, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
              setTimeout(() => {
                fetchData(retryCount + 1);
              }, retryDelay);
              return;
            }
            throw new Error('Failed to fetch trades data');
          }
          const result = await response.json();
          console.log('Simple API raw result:', result);
          setData({
            trades: result.trades,
            count: result.count,
            totalPnl: result.totalPnl,
            totalVolume: result.totalVolume
          });
        }
      } catch (err) {
        // If it's a network error and we haven't exceeded max retries, retry after delay
        if (retryCount < maxRetries && (err instanceof TypeError || (err instanceof Error && err.message.includes('fetch')))) {
          console.log(`Trades network error, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
          setTimeout(() => {
            fetchData(retryCount + 1);
          }, retryDelay);
          return;
        }
        
        console.error('=== useTradesData FETCH ERROR ===', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        // Only set loading to false if we're not retrying (when we've reached max retries or succeeded)
        setLoading(false);
        console.log('=== useTradesData FETCH COMPLETE ===');
      }
    }

    fetchData();
  }, [toFilterOptions, isDemo, shouldUseComplexFiltering, page, limit, authLoading]);

  // Simple fix for demo mode race condition: refetch when demo mode becomes available
  useEffect(() => {
    // If we have no data yet and demo mode just became true, refetch
    if (isDemo && !data && !loading) {
      console.log('Demo mode detected without data, refetching...');
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const filters = toFilterOptions();
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
          setData({
            trades: result.trades,
            count: result.count,
            totalPnl: result.totalPnl,
            totalVolume: result.totalVolume
          });
        } catch (err) {
          console.error('Demo refetch error:', err);
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isDemo, data, loading, toFilterOptions]);

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