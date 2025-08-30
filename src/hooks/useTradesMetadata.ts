'use client';

import { useState, useEffect } from 'react';
import { TradesMetadata } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useTradesMetadata() {
  const [metadata, setMetadata] = useState<TradesMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDemo, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Don't fetch data until auth state is resolved
    if (authLoading) {
      return;
    }

    async function fetchMetadata() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/trades/metadata`);
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
  }, [isDemo, authLoading]);

  const refetch = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/trades/metadata`);
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