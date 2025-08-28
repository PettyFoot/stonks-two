'use client';

import { useState, useEffect } from 'react';
import { ExecutionOrder } from '@/components/ExecutionsTable';
import { Trade } from '@/types';

export interface RecordsData {
  id: string;
  date: string;
  pnl: number;
  totalTrades: number;
  totalVolume: number;
  winRate: number;
  notes: string;
  notesChanges: string;
  trades: Trade[];
  executions: ExecutionOrder[];
  commissions?: number;
  netPnl?: number;
}

interface UseRecordsDataReturn {
  data: RecordsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRecordsData(date: string | null, demo: boolean = false): UseRecordsDataReturn {
  const [data, setData] = useState<RecordsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordsData = async () => {
    if (!date) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch records data for the specified date
      const params = new URLSearchParams();
      params.append('date', date);
      if (demo) params.append('demo', 'true');

      const response = await fetch(`/api/records?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch records data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.entries || result.entries.length === 0) {
        // No records entry exists for this date
        setData({
          id: `records_${date}`,
          date,
          pnl: 0,
          totalTrades: 0,
          totalVolume: 0,
          winRate: 0,
          notes: '',
          notesChanges: '',
          trades: [],
          executions: [],
          commissions: 0,
          netPnl: 0
        });
        return;
      }

      const recordsEntry = result.entries[0];

      const recordsData: RecordsData = {
        id: recordsEntry.id,
        date: recordsEntry.date,
        pnl: recordsEntry.pnl,
        totalTrades: recordsEntry.totalTrades || recordsEntry.trades.length,
        totalVolume: recordsEntry.totalVolume || (recordsEntry.executions || []).reduce((sum: number, exec: ExecutionOrder) => sum + (exec.orderQuantity || 0), 0),
        winRate: recordsEntry.winRate || 0,
        notes: recordsEntry.notes || '',
        notesChanges: recordsEntry.notesChanges || '',
        trades: recordsEntry.trades,
        executions: recordsEntry.executions || [], // Use executions directly from API
        commissions: recordsEntry.commissions || 0,
        netPnl: recordsEntry.netPnl || recordsEntry.pnl
      };

      setData(recordsData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch records data';
      console.error('Records data fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordsData();
  }, [date, demo]); // fetchRecordsData is recreated on each render, which is intentional for data freshness

  const refetch = () => {
    fetchRecordsData();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}