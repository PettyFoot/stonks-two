'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import TradesTable from '@/components/TradesTable';
import ColumnSettingsModal from '@/components/ColumnSettingsModal';
import { Button } from '@/components/ui/button';
import { Trade, ViewMode, ColumnConfiguration } from '@/types';
import { mockTrades } from '@/data/mockData';

export default function DemoTrades() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [columnConfig, setColumnConfig] = useState<ColumnConfiguration[]>([]);

  const viewModeButtons = [
    { id: 'table', label: 'Table', active: viewMode === 'table' },
    { id: 'gross', label: 'Gross', active: viewMode === 'gross' },
    { id: 'net', label: 'Net', active: viewMode === 'net' }
  ];

  const handleTradeSelect = (trade: Trade) => {
    console.log('Selected trade:', trade);
  };

  const handleColumnsChange = (columns: ColumnConfiguration[]) => {
    setColumnConfig(columns);
  };

  // For demo purposes, use all mock trades
  const filteredTrades = mockTrades;

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Trades" 
        subtitle="Demo Mode - Sample Data"
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
        demo={true}
        showTimeRangeTabs={false}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Trades Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Trades</h2>
            
            {/* View Mode Buttons */}
            <div className="flex items-center gap-4">
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
              
              <ColumnSettingsModal onColumnsChange={handleColumnsChange} />
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
            columnConfig={columnConfig}
          />
        )}


        {viewMode === 'gross' && (
          <div className="bg-surface border border-default rounded-lg p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                ${filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0).toFixed(2)}
              </div>
              <div className="text-muted">Gross P&L</div>
            </div>
          </div>
        )}

        {viewMode === 'net' && (
          <div className="bg-surface border border-default rounded-lg p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                ${(filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0) * 0.95).toFixed(2)}
              </div>
              <div className="text-muted">Net P&L (after commissions)</div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Total Trades</div>
            <div className="text-2xl font-bold text-primary">{filteredTrades.length}</div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-[#16A34A]">
              {((filteredTrades.filter(t => t.pnl > 0).length / filteredTrades.length) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Total Volume</div>
            <div className="text-2xl font-bold text-primary">
              {filteredTrades.reduce((sum, trade) => sum + (trade.volume ?? 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-sm text-muted mb-1">Total P&L</div>
            <div className={`text-2xl font-bold ${
              filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}>
              ${filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}