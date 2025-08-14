'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import TradesTable from '@/components/TradesTable';
import { Button } from '@/components/ui/button';
import { FilterOptions, Trade, ViewMode } from '@/types';
import { useTradesData } from '@/hooks/useTradesData';
import { Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Trades() {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [calculating, setCalculating] = useState(false);
  const { data: tradesData, loading, error, refetch } = useTradesData(filters);

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

  const viewModeButtons = [
    { id: 'table', label: 'Table', active: viewMode === 'table' },
    { id: 'charts-large', label: 'Charts (large)', active: viewMode === 'charts-large' },
    { id: 'charts-small', label: 'Charts (small)', active: viewMode === 'charts-small' },
    { id: 'gross', label: 'Gross', active: viewMode === 'gross' },
    { id: 'net', label: 'Net', active: viewMode === 'net' }
  ];

  const handleTradeSelect = (trade: Trade) => {
    // Handle trade selection - could open a modal or navigate to trade detail
    console.log('Selected trade:', trade);
  };

  // Use real trades data instead of mock data
  const trades = tradesData?.trades || [];
  const filteredTrades = trades;

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
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
        filters={filters}
        onFiltersChange={setFilters}
        showCustomFilters={true}
        showAdvanced={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Trades Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Trades</h2>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <Button
                onClick={calculateTrades}
                disabled={calculating}
                size="sm"
                className="bg-[#16A34A] hover:bg-[#15803d] text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating...' : 'Calculate Trades'}
              </Button>

              <div className="flex rounded-lg border border-default bg-surface">
                {viewModeButtons.map((button, index) => (
                  <Button
                    key={button.id}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-8 text-xs
                      ${index === 0 ? 'rounded-l-lg rounded-r-none' : ''}
                      ${index === viewModeButtons.length - 1 ? 'rounded-r-lg rounded-l-none' : ''}
                      ${index > 0 && index < viewModeButtons.length - 1 ? 'rounded-none' : ''}
                      ${index > 0 ? 'border-l' : ''}
                      ${button.active ? 'bg-muted/10' : ''}
                    `}
                    onClick={() => setViewMode(button.id as ViewMode)}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
              
              <Button variant="ghost" size="sm" className="h-8">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Trades Content */}
        {viewMode === 'table' && (
          <TradesTable 
            trades={filteredTrades}
            showCheckboxes={true}
            showPagination={true}
            onTradeSelect={handleTradeSelect}
          />
        )}

        {/* Chart views - placeholder for now */}
        {viewMode === 'charts-large' && (
          <div className="bg-surface border border-default rounded-lg p-8">
            <div className="text-center text-muted">
              Large chart view will be implemented here
            </div>
          </div>
        )}

        {viewMode === 'charts-small' && (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-default rounded-lg p-4">
                <div className="text-center text-muted text-sm">
                  Small chart #{i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'gross' && (
          <div className="bg-surface border border-default rounded-lg p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                ${(tradesData?.totalPnl || 0).toFixed(2)}
              </div>
              <div className="text-muted">Gross P&L</div>
            </div>
          </div>
        )}

        {viewMode === 'net' && (
          <div className="bg-surface border border-default rounded-lg p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                ${((tradesData?.totalPnl || 0) * 0.95).toFixed(2)}
              </div>
              <div className="text-muted">Net P&L (after commissions)</div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Total Trades</div>
            <div className="text-2xl font-bold text-primary">{tradesData?.count || 0}</div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-[#16A34A]">
              {filteredTrades.length > 0 
                ? ((filteredTrades.filter(t => t.pnl > 0).length / filteredTrades.length) * 100).toFixed(1)
                : '0'
              }%
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Total Volume</div>
            <div className="text-2xl font-bold text-primary">
              {(tradesData?.totalVolume || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Total P&L</div>
            <div className={`text-2xl font-bold ${
              (tradesData?.totalPnl || 0) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}>
              ${(tradesData?.totalPnl || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}