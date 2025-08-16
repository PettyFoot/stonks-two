'use client';

import { useState, useEffect } from 'react';
import { TradesMetadata } from '@/types';

export function useTradesMetadata(demo: boolean = false) {
  const [metadata, setMetadata] = useState<TradesMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (demo) params.append('demo', 'true');
        
        const response = await fetch(`/api/trades/metadata?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trades metadata');
        }
        
        const result = await response.json();
        setMetadata(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [demo]);

  const refetch = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (demo) params.append('demo', 'true');
      
      const response = await fetch(`/api/trades/metadata?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trades metadata');
      }
      
      const result = await response.json();
      setMetadata(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return {
    metadata,
    loading,
    error,
    refetch
  };
}