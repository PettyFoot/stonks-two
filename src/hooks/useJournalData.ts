'use client';

import { useState, useEffect } from 'react';
import { ExecutionOrder } from '@/components/ExecutionsTable';
import { Trade } from '@/types';

export interface JournalData {
  id: string;
  date: string;
  pnl: number;
  totalTrades: number;
  totalVolume: number;
  winRate: number;
  notes: string;
  trades: Trade[];
  executions: ExecutionOrder[];
  commissions?: number;
  netPnl?: number;
}

interface UseJournalDataReturn {
  data: JournalData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useJournalData(date: string | null, demo: boolean = false): UseJournalDataReturn {
  const [data, setData] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJournalData = async () => {
    if (!date) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch journal data for the specified date
      const params = new URLSearchParams();
      params.append('date', date);
      if (demo) params.append('demo', 'true');

      const response = await fetch(`/api/journal?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch journal data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.entries || result.entries.length === 0) {
        // No journal entry exists for this date
        setData({
          id: `journal_${date}`,
          date,
          pnl: 0,
          totalTrades: 0,
          totalVolume: 0,
          winRate: 0,
          notes: '',
          trades: [],
          executions: [],
          commissions: 0,
          netPnl: 0
        });
        return;
      }

      const journalEntry = result.entries[0];

      const journalData: JournalData = {
        id: journalEntry.id,
        date: journalEntry.date,
        pnl: journalEntry.pnl,
        totalTrades: journalEntry.totalTrades || journalEntry.trades.length,
        totalVolume: journalEntry.totalVolume || (journalEntry.executions || []).reduce((sum: number, exec: ExecutionOrder) => sum + (exec.orderQuantity || 0), 0),
        winRate: journalEntry.winRate || 0,
        notes: journalEntry.notes || '',
        trades: journalEntry.trades,
        executions: journalEntry.executions || [], // Use executions directly from API
        commissions: journalEntry.commissions || 0,
        netPnl: journalEntry.netPnl || journalEntry.pnl
      };

      setData(journalData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch journal data';
      console.error('Journal data fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournalData();
  }, [date, demo]); // fetchJournalData is recreated on each render, which is intentional for data freshness

  const refetch = () => {
    fetchJournalData();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}