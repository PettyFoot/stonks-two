'use client';

import React, { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import ExecutionsTable from '@/components/ExecutionsTable';
import StatsGrid from '@/components/StatsGrid';
import TradesTable from '@/components/TradesTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Lock } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useRecordsData } from '@/hooks/useRecordsData';
import { useTradesData } from '@/hooks/useTradesData';
import TradeCandlestickChart from '@/components/charts/TradeCandlestickChart';
import AdSense from '@/components/AdSense';
import ShareButton from '@/components/ShareButton';
import { FullPageTriangleLoader } from '@/components/ui/TriangleLoader';
import { calculateTradeMetrics } from '@/lib/tradeMetrics';
import { MarketDataResponse } from '@/lib/marketData/types';

function RecordsContent() {
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get('date');
  const selectedTradeId = searchParams.get('tradeId'); // Get specific trade ID if provided

  // const { isDemo } = useAuth(); // Currently not used but may be needed for demo features

  // Use real records data instead of mock data
  const { data: recordsData, loading, error } = useRecordsData(selectedDate, selectedTradeId);

  // Get trades data for the default view when no specific trade is selected
  const { data: tradesData, loading: tradesLoading } = useTradesData();


  // State for market data from the chart component
  const [chartMarketData, setChartMarketData] = useState<MarketDataResponse | null>(null);
  
  // Calculate execution metrics from real data
  const executionMetrics = {
    totalExecutions: recordsData?.executions.length || 0,
    totalVolume: recordsData?.totalVolume || 0,
    totalPnl: recordsData?.pnl || 0
  };

  // Determine which trade we're editing notes for
  // If tradeId is provided in URL, use that specific trade
  // Otherwise, if there's only one trade, use that trade
  // Otherwise, use records-level notes (BLANK trade)
  const targetTrade = selectedTradeId 
    ? recordsData?.trades.find(t => t.id === selectedTradeId)
    : recordsData?.trades.length === 1 
      ? recordsData.trades[0] 
      : null;


  // Auto-save notes functionality - saves directly to notes field
  const autoSaveNotes = async (notes: string) => {
    try {
      const response = await fetch('/api/records/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes, 
          date: selectedDate,
          tradeId: targetTrade?.id, // Pass specific trade ID if available
          saveChanges: true // Always save directly to notes field
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to auto-save notes');
      }
    } catch (error) {
      console.error('Error auto-saving notes:', error);
      throw error;
    }
  };


  // Get the correct initial notes value from either specific trade or records level
  const getInitialNotes = () => {
    if (targetTrade) {
      return targetTrade.notes || '';
    }
    return recordsData?.notes || '';
  };

  const {
    value: notes,
    setValue: setNotes,
    error: saveError
  } = useAutoSave({
    initialValue: getInitialNotes(), // Initialize with the correct notes
    saveFunction: autoSaveNotes, // Auto-save directly to notes field
    debounceMs: 3000,
    enabled: !!recordsData // Only enable auto-save when data is loaded
  });

  // Use ref to track if notes have been initialized to prevent loops
  const notesInitialized = useRef(false);

  // Update notes when records data first loads (but don't override user input)
  useEffect(() => {
    const initialValue = targetTrade 
      ? targetTrade.notes || ''
      : recordsData?.notes || '';
    
    if (recordsData && !notesInitialized.current) {
      setNotes(initialValue);
      notesInitialized.current = true;
    }
  }, [recordsData, targetTrade, setNotes]);


  // All executions for this records entry - memoized to prevent unnecessary recalculations
  const { mostActiveSymbol, chartExecutions } = useMemo(() => {
    const allExecutions = recordsData?.executions || [];

    // Group executions by symbol and find the most active symbol
    const executionsBySymbol = allExecutions.reduce((acc, execution) => {
      const symbol = execution.symbol;
      if (!acc[symbol]) {
        acc[symbol] = [];
      }
      acc[symbol].push(execution);
      return acc;
    }, {} as Record<string, typeof allExecutions>);

    // Find the symbol with the most executions for chart display
    const mostActiveSymbol = Object.keys(executionsBySymbol).length > 0 
      ? Object.entries(executionsBySymbol).reduce((a, b) => 
          executionsBySymbol[a[0]].length > executionsBySymbol[b[0]].length ? a : b
        )[0] 
      : null;

    const chartExecutions = mostActiveSymbol ? executionsBySymbol[mostActiveSymbol] : [];

    return { mostActiveSymbol, chartExecutions };
  }, [recordsData?.executions]);

  // Calculate MFE/MAE metrics using chart data
  const tradeMetrics = useMemo(() => {
    if (!mostActiveSymbol || !chartExecutions.length || !chartMarketData?.ohlc?.length) {
      return null;
    }

    try {
      const metrics = calculateTradeMetrics({
        symbol: mostActiveSymbol,
        executions: chartExecutions,
        ohlcData: chartMarketData.ohlc
      });

      return metrics;
    } catch (error) {
      console.error('Error calculating trade metrics:', error);
      return null;
    }
  }, [mostActiveSymbol, chartExecutions, chartMarketData]);

  // Show loading state
  if (loading) {
    return (
      <div className="relative h-screen">
        <FullPageTriangleLoader />
      </div>
    );
  }

  // Show loading state for trades when no records data
  if (!recordsData && tradesLoading) {
    return (
      <div className="relative h-screen">
        <FullPageTriangleLoader text="Loading trades..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Records" showTimeRangeFilters={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  // Handle no data case - show trades table for trade selection
  if (!recordsData) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Records" showTimeRangeFilters={false} />
        <FilterPanel showAdvanced={true} />
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-primary mb-2">Select a Trade to View Records</h2>
            <p className="text-muted text-sm">
              {selectedDate 
                ? `No records found for ${selectedDate}. Select a trade from the table below to view its detailed records.`
                : 'Select a trade from the table below to view its detailed records.'
              }
            </p>
          </div>
          <TradesTable 
            trades={tradesData?.trades || []}
            showCheckboxes={false}
            showPagination={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Records" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Records Entry Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-primary">{recordsData.date}</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">P&L:</span>
                  <span className={`text-lg font-semibold ${
                    recordsData.pnl >= 0 ? 'text-positive' : 'text-negative'
                  }`}>
                    ${recordsData.pnl.toFixed(2)}
                  </span>
                  <Lock className="h-3 w-3 text-muted" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShareButton
                date={selectedDate || undefined}
                tradeId={selectedTradeId || undefined}
                variant="button"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Row 1: Chart (full width) */}
          <div>
            {mostActiveSymbol ? (
              <TradeCandlestickChart
                symbol={mostActiveSymbol}
                executions={chartExecutions}
                tradeDate={recordsData.date}
                height={600}
                onExecutionSelect={(execution) => {

                  // TODO: Highlight the execution in the table
                }}
                onMarketDataUpdate={(marketData) => {
                  setChartMarketData(marketData);
                }}
              />
            ) : (
              <Card className="bg-surface border-default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Chart</CardTitle>
                </CardHeader>
                <CardContent className="h-96">
                  <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                    <div className="text-center text-muted">
                      <div className="text-sm">No executions available for chart display</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Row 2: Stats (full width) */}
          <div>
            <Card className="bg-surface border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-primary">Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <StatsGrid
                  totalExecutions={executionMetrics.totalExecutions}
                  symbol={mostActiveSymbol || undefined}
                  totalVolume={executionMetrics.totalVolume}
                  mfeRatio={tradeMetrics?.mfeRatio}
                  commissions={recordsData.commissions}
                  netPnl={recordsData.netPnl || recordsData.pnl}
                />
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Notes Section (full width) */}
          <Card className="bg-surface border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-primary">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Click here to start typing your notes..."
                className="min-h-[120px] resize-none"
              />
              {saveError && (
                <p className="text-sm text-red-600 mt-2">Error: {saveError}</p>
              )}
            </CardContent>
          </Card>

          {/* Row 4: Orders/Executions Table (full width) */}
          <ExecutionsTable 
            executions={recordsData.executions}
            loading={false}
            error={null}
            showActions={true}
            onExecutionSelect={(execution) => {

            }}
          />

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
    </div>
  );
}

export default function Records() {
  return (
    <Suspense fallback={
      <div className="relative h-screen">
        <FullPageTriangleLoader text="Loading records..." />
      </div>
    }>
      <RecordsContent />
    </Suspense>
  );
}