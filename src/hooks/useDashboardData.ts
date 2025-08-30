'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Use ref to track current request and prevent race conditions
  const currentRequestRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: DashboardData; timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  const fetchData = useCallback(async (options = toFilterOptions()) => {
    // Abort any ongoing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }
    
    const controller = new AbortController();
    currentRequestRef.current = controller;
    
    try {
      setError(null);
      
      // Create cache key from filter options
      const cacheKey = JSON.stringify(options);
      const now = Date.now();
      
      // Check cache first
      const cached = cacheRef.current.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const params = new URLSearchParams();
      
      // Pass ALL filter parameters to the API
      if (options.dateFrom) params.append('dateFrom', options.dateFrom);
      if (options.dateTo) params.append('dateTo', options.dateTo);
      if (options.symbol) params.append('symbol', options.symbol);
      if (options.side) params.append('side', options.side);
      if (options.tags && options.tags.length > 0) {
        params.append('tags', options.tags.join(','));
      }
      if (options.duration) params.append('duration', options.duration);
      if (options.showOpenTrades !== undefined) {
        params.append('showOpenTrades', options.showOpenTrades.toString());
      }
      
      const response = await fetch(`/api/dashboard?${params.toString()}`, {
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Cache the result
      cacheRef.current.set(cacheKey, { 
        data: result, 
        timestamp: now 
      });
      
      // Clean old cache entries (keep only last 10)
      if (cacheRef.current.size > 10) {
        const oldest = Array.from(cacheRef.current.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
        cacheRef.current.delete(oldest[0]);
      }
      
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't update error state
      }
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      currentRequestRef.current = null;
    }
  }, [toFilterOptions]);
  
  useEffect(() => {
    // Don't fetch data until auth state is resolved
    if (authLoading) {
      return;
    }

    fetchData();
    
    // Cleanup function to abort request on unmount
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, [fetchData, authLoading]);

  // Optimized refetch with cache invalidation
  const refetch = useCallback(() => {
    // Clear cache for current filters
    const cacheKey = JSON.stringify(toFilterOptions());
    cacheRef.current.delete(cacheKey);
    
    // Re-fetch data
    fetchData();
  }, [fetchData, toFilterOptions]);

  return {
    data,
    loading,
    error,
    refetch,
    // Expose cache stats for debugging
    cacheSize: cacheRef.current.size
  };
}