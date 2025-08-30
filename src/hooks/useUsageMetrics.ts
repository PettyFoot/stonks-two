import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

export interface UsageMetric {
  category: string;
  name: string;
  current: number;
  limit: number | null; // null means unlimited
  percentage: number;
  resetDate?: string;
  unit: string;
}

export interface UsageSummary {
  period: 'current_month' | 'billing_cycle';
  periodStart: string;
  periodEnd: string;
  totalRequests: number;
  remainingRequests: number | null;
  usagePercentage: number;
}

export interface UsageHistory {
  date: string;
  category: string;
  usage: number;
  limit?: number;
}

interface UseUsageMetricsReturn {
  metrics: UsageMetric[];
  summary: UsageSummary | null;
  history: UsageHistory[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getMetricByCategory: (category: string) => UsageMetric | undefined;
  isNearLimit: (threshold?: number) => boolean;
  getHighestUsageMetric: () => UsageMetric | undefined;
}

/**
 * Hook for managing usage metrics and limits
 * Tracks API usage, feature usage, and provides insights for premium limits
 */
export function useUsageMetrics(): UseUsageMetricsReturn {
  const { user, isLoading: authLoading } = useUser();
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [history, setHistory] = useState<UsageHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch usage metrics from API
   */
  const fetchUsageMetrics = useCallback(async (): Promise<void> => {
    if (!user) {
      setMetrics([]);
      setSummary(null);
      setHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch('/api/usage/metrics');
      
      if (!response.ok) {
        if (response.status === 401) {
          setMetrics([]);
          setSummary(null);
          setHistory([]);
          return;
        }
        throw new Error('Failed to fetch usage metrics');
      }

      const data = await response.json();
      
      // Transform API data into UsageMetric format
      const transformedMetrics: UsageMetric[] = [
        {
          category: 'trades',
          name: 'Trade Imports',
          current: data.tradeImports?.current || 0,
          limit: data.tradeImports?.limit || null,
          percentage: data.tradeImports?.percentage || 0,
          resetDate: data.tradeImports?.resetDate,
          unit: 'imports'
        },
        {
          category: 'api',
          name: 'API Requests',
          current: data.apiRequests?.current || 0,
          limit: data.apiRequests?.limit || null,
          percentage: data.apiRequests?.percentage || 0,
          resetDate: data.apiRequests?.resetDate,
          unit: 'requests'
        },
        {
          category: 'exports',
          name: 'Data Exports',
          current: data.dataExports?.current || 0,
          limit: data.dataExports?.limit || null,
          percentage: data.dataExports?.percentage || 0,
          resetDate: data.dataExports?.resetDate,
          unit: 'exports'
        },
        {
          category: 'storage',
          name: 'Data Storage',
          current: data.dataStorage?.current || 0,
          limit: data.dataStorage?.limit || null,
          percentage: data.dataStorage?.percentage || 0,
          unit: 'MB'
        }
      ].filter(metric => metric.current > 0 || metric.limit !== null);

      setMetrics(transformedMetrics);
      setSummary({
        period: data.summary?.period || 'current_month',
        periodStart: data.summary?.periodStart || new Date().toISOString(),
        periodEnd: data.summary?.periodEnd || new Date().toISOString(),
        totalRequests: data.summary?.totalRequests || 0,
        remainingRequests: data.summary?.remainingRequests || null,
        usagePercentage: data.summary?.usagePercentage || 0
      });

      setHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching usage metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage metrics');
      
      // Set default metrics on error (for free tier)
      setMetrics([
        {
          category: 'trades',
          name: 'Trade Imports',
          current: 0,
          limit: 100,
          percentage: 0,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          unit: 'imports'
        }
      ]);
      
      setSummary({
        period: 'current_month',
        periodStart: new Date().toISOString(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        totalRequests: 0,
        remainingRequests: 100,
        usagePercentage: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Get metric by category
   */
  const getMetricByCategory = useCallback((category: string): UsageMetric | undefined => {
    return metrics.find(metric => metric.category === category);
  }, [metrics]);

  /**
   * Check if usage is near limit
   */
  const isNearLimit = useCallback((threshold: number = 80): boolean => {
    return metrics.some(metric => 
      metric.limit !== null && metric.percentage >= threshold
    );
  }, [metrics]);

  /**
   * Get metric with highest usage percentage
   */
  const getHighestUsageMetric = useCallback((): UsageMetric | undefined => {
    return metrics
      .filter(metric => metric.limit !== null)
      .reduce((highest, current) => 
        (!highest || current.percentage > highest.percentage) ? current : highest
      , undefined as UsageMetric | undefined);
  }, [metrics]);

  /**
   * Refresh usage data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchUsageMetrics();
  }, [fetchUsageMetrics]);

  // Fetch metrics on mount and when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchUsageMetrics();
    }
  }, [authLoading, fetchUsageMetrics]);

  // Refresh metrics every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && !isLoading) {
        fetchUsageMetrics();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, isLoading, fetchUsageMetrics]);

  return {
    metrics,
    summary,
    history,
    isLoading: isLoading || authLoading,
    error,
    refresh,
    getMetricByCategory,
    isNearLimit,
    getHighestUsageMetric,
  };
}

/**
 * Helper hook for usage formatting utilities
 */
export function useUsageFormatters() {
  const formatUsage = useCallback((current: number, limit: number | null, unit: string): string => {
    if (limit === null) {
      return `${current.toLocaleString()} ${unit}`;
    }
    return `${current.toLocaleString()} / ${limit.toLocaleString()} ${unit}`;
  }, []);

  const formatPercentage = useCallback((percentage: number): string => {
    return `${Math.round(percentage)}%`;
  }, []);

  const getUsageColor = useCallback((percentage: number) => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'secondary';
    return 'default';
  }, []);

  const formatResetDate = useCallback((resetDate?: string): string => {
    if (!resetDate) return 'Never';
    
    const date = new Date(resetDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const getUsageStatusText = useCallback((metric: UsageMetric): string => {
    if (metric.limit === null) return 'Unlimited';
    if (metric.percentage >= 100) return 'Limit reached';
    if (metric.percentage >= 90) return 'Nearing limit';
    if (metric.percentage >= 75) return 'High usage';
    return 'Normal usage';
  }, []);

  return {
    formatUsage,
    formatPercentage,
    getUsageColor,
    formatResetDate,
    getUsageStatusText,
  };
}