'use client';

import React, { useState, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import TradesTable from '@/components/TradesTable';
import ColumnSettingsModal from '@/components/ColumnSettingsModal';
import { Trade, ColumnConfiguration } from '@/types';
import { useTradesData } from '@/hooks/useTradesData';
import { FullPageTriangleLoader } from '@/components/ui/TriangleLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';
import AdSense from '@/components/AdSense';

export default function Trades() {
  const [columnConfig, setColumnConfig] = useState<ColumnConfiguration[]>([]);
  
  const { isDemo } = useAuth();
  const { filters, toFilterOptions } = useGlobalFilters();
  const { data: tradesData, loading, error } = useTradesData();
  

  // Format date range for display using actual filter dates
  const formatDateRange = useCallback(() => {
    const filterOptions = toFilterOptions();

    if (filterOptions.dateFrom && filterOptions.dateTo) {
      const fromDate = new Date(filterOptions.dateFrom);
      const toDate = new Date(filterOptions.dateTo);

      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };

      return `${fromDate.toLocaleDateString('en-US', options)} - ${toDate.toLocaleDateString('en-US', options)}`;
    }

    return '30 Days'; // Fallback
  }, [toFilterOptions]);











  const handleTradeSelect = (_trade: Trade) => {
    // Handle trade selection - could open a modal or navigate to trade detail

  };

  const handleColumnsChange = (columns: ColumnConfiguration[]) => {
    setColumnConfig(columns);
  };

  // Use real trades data instead of mock data
  const trades = tradesData?.trades || [];
  const filteredTrades = trades;




  // Show loading state
  if (loading) {
    return (
      <div className="relative h-screen">
        <FullPageTriangleLoader text="Loading trades..." />
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <h2 className="text-base sm:text-lg font-semibold text-primary">Trades</h2>
              <div className="text-sm text-muted font-medium">
                Current Period: {formatDateRange()}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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