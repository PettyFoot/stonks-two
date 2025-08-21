/**
 * Custom React Hook for Report Data
 * 
 * Provides a clean interface for fetching and managing report data
 * with proper error handling, loading states, and caching.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  WinLossReportResponse, 
  DashboardMetricsResponse, 
  ReportFilters,
  UseReportData 
} from '@/types/reports';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry<any>>();

/**
 * Hook for fetching Win/Loss report data
 */
export function useWinLossReport(
  filters: ReportFilters
): UseReportData<WinLossReportResponse> {
  const [data, setData] = useState<WinLossReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.symbol && filters.symbol !== 'all') params.append('symbol', filters.symbol);
    if (filters.side && filters.side !== 'all') params.append('side', filters.side);
    return params.toString();
  }, [filters]);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const queryString = buildQueryString();
    const cacheKey = `winloss:${queryString}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(
        `/api/reports/win-loss?${queryString}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update cache
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        key: cacheKey,
      });

      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        console.error('Error fetching win/loss report:', err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [buildQueryString]);

  useEffect(() => {
    fetchData();

    return () => {
      // Cleanup: cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for fetching Dashboard metrics
 */
export function useDashboardMetrics(
  filters: ReportFilters,
  metrics: string[] = ['all']
): UseReportData<DashboardMetricsResponse> {
  const [data, setData] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.symbol && filters.symbol !== 'all') params.append('symbol', filters.symbol);
    if (filters.side && filters.side !== 'all') params.append('side', filters.side);
    params.append('metrics', metrics.join(','));
    return params.toString();
  }, [filters, metrics]);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const queryString = buildQueryString();
    const cacheKey = `dashboard:${queryString}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(
        `/api/reports/dashboard-metrics?${queryString}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update cache
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        key: cacheKey,
      });

      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        console.error('Error fetching dashboard metrics:', err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [buildQueryString]);

  useEffect(() => {
    fetchData();

    return () => {
      // Cleanup: cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for real-time cumulative P&L updates
 * Fetches data more frequently for live dashboard
 */
export function useLiveCumulativePnL(
  filters: ReportFilters,
  refreshInterval: number = 30000 // 30 seconds default
): UseReportData<CumulativeDataPoint[]> {
  const [data, setData] = useState<CumulativeDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.symbol && filters.symbol !== 'all') params.append('symbol', filters.symbol);
      if (filters.side && filters.side !== 'all') params.append('side', filters.side);

      const response = await fetch(`/api/reports/win-loss?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: WinLossReportResponse = await response.json();
      setData(result.cumulative);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
        console.error('Error fetching cumulative P&L:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();

    // Set up refresh interval if specified
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Utility function to clear the cache
 */
export function clearReportCache(): void {
  cache.clear();
}

/**
 * Utility function to get cache statistics
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
  oldestEntry: number | null;
} {
  const keys = Array.from(cache.keys());
  let oldestTimestamp: number | null = null;

  cache.forEach((entry) => {
    if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }
  });

  return {
    size: cache.size,
    keys,
    oldestEntry: oldestTimestamp,
  };
}