'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import TradesTable from '@/components/TradesTable';
import ColumnSettingsModal from '@/components/ColumnSettingsModal';
import { Button } from '@/components/ui/button';
import { Trade, ColumnConfiguration } from '@/types';
import { useTradesData } from '@/hooks/useTradesData';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import AdSense from '@/components/AdSense';

export default function Trades() {
  const [calculating, setCalculating] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfiguration[]>([]);
  
  const { isDemo } = useAuth();
  const { data: tradesData, loading, error, refetch } = useTradesData();

  console.log('=== TRADES PAGE RENDER ===');
  console.log('Demo mode:', isDemo);
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Raw tradesData:', tradesData);
  console.log('Trades array:', tradesData?.trades);
  console.log('Trades count:', tradesData?.trades?.length);

  const calculateTrades = async () => {
    setCalculating(true);
    try {
      const response = await fetch('/api/trades/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Successfully calculated ${data.tradesCalculated} trades`);
        // Refresh the trades data
        if (refetch) refetch();
      } else {
        toast.error('Failed to calculate trades');
      }
    } catch (error) {
      console.error('Error calculating trades:', error);
      toast.error('Failed to calculate trades');
    } finally {
      setCalculating(false);
    }
  };


  const handleTradeSelect = (trade: Trade) => {
    // Handle trade selection - could open a modal or navigate to trade detail
    console.log('Selected trade:', trade);
  };

  const handleColumnsChange = (columns: ColumnConfiguration[]) => {
    setColumnConfig(columns);
  };

  // Use real trades data instead of mock data
  const trades = tradesData?.trades || [];
  const filteredTrades = trades;

  console.log('Final trades for display:', trades);
  console.log('Final filteredTrades for display:', filteredTrades);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageTriangleLoader text="Loading trades..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error loading trades: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Trades" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
        demo={isDemo}
      />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* Trades Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-primary">Trades</h2>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Button
                onClick={calculateTrades}
                disabled={calculating}
                size="sm"
                className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating...' : 'Calculate Trades'}
              </Button>

              
              <ColumnSettingsModal onColumnsChange={handleColumnsChange} />
            </div>
          </div>
        </div>

        {/* Trades Content */}
        <TradesTable 
          trades={filteredTrades}
          showCheckboxes={true}
          showPagination={true}
          onTradeSelect={handleTradeSelect}
          columnConfig={columnConfig}
        />

        {/* Summary Stats */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface border border-default rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted mb-1">Total Trades</div>
            <div className="text-xl sm:text-2xl font-bold text-primary">{tradesData?.count || 0}</div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted mb-1">Win Rate</div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--theme-green)]">
              {filteredTrades.length > 0 
                ? ((filteredTrades.filter(t => t.pnl > 0).length / filteredTrades.length) * 100).toFixed(1)
                : '0'
              }%
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted mb-1">Total Volume</div>
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {(tradesData?.totalVolume || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-muted mb-1">Total P&L</div>
            <div className={`text-xl sm:text-2xl font-bold ${
              (tradesData?.totalPnl || 0) >= 0 ? 'text-[var(--theme-green)]' : 'text-[var(--theme-red)]'
            }`}>
              ${(tradesData?.totalPnl || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* AdSense Ad Unit */}
        <div className="mt-6">
          <AdSense 
            className="flex items-center justify-center min-h-[120px] my-4"
            slot="7836991491773203"
            format="auto"
            responsive={true}
          />
        </div>
      </div>
    </div>
  );
}