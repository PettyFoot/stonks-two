'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import ExecutionsTable from '@/components/ExecutionsTable';
import StatsGrid from '@/components/StatsGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Lock } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useJournalData } from '@/hooks/useJournalData';
import TradeCandlestickChart from '@/components/charts/TradeCandlestickChart';

export default function Journal() {
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get('date');
  // Removed selectedTrade state as it's no longer needed
  
  // Use real journal data instead of mock data
  const { data: journalData, loading, error, refetch } = useJournalData(selectedDate);
  
  // Calculate execution metrics from real data
  const executionMetrics = {
    totalExecutions: journalData?.executions.length || 0,
    totalVolume: journalData?.totalVolume || 0,
    totalPnl: journalData?.pnl || 0
  };

  // Auto-save notes functionality with real API
  const saveNotes = async (notes: string) => {
    try {
      const response = await fetch('/api/journal/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes, 
          date: selectedDate
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save notes');
      }
      
      // Refresh journal data after saving
      refetch();
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error;
    }
  };

  const {
    value: notes,
    setValue: setNotes,
    status: saveStatus,
    isSaving,
    error: saveError
  } = useAutoSave({
    initialValue: journalData?.notes || '',
    saveFunction: saveNotes,
    debounceMs: 3000,
    enabled: !!journalData // Only enable auto-save when data is loaded
  });

  // Update notes when journal data changes
  useEffect(() => {
    if (journalData && journalData.notes !== notes) {
      setNotes(journalData.notes);
    }
  }, [journalData, notes, setNotes]);

  // All executions for this journal entry
  const allExecutions = journalData?.executions || [];

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

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Journal" showTimeRangeFilters={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Journal" showTimeRangeFilters={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  // Handle no data case
  if (!journalData) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Journal" showTimeRangeFilters={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted">No journal data found for {selectedDate}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Journal" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
        showTimeRangeTabs={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Journal Entry Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-primary">{journalData.date}</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">P&L:</span>
                  <span className={`text-lg font-semibold ${
                    journalData.pnl >= 0 ? 'text-positive' : 'text-negative'
                  }`}>
                    ${journalData.pnl.toFixed(2)}
                  </span>
                  <Lock className="h-3 w-3 text-muted" />
                </div>
              </div>
            </div>

            <div className="text-right">
              <Button className="bg-[#16A34A] hover:bg-[#15803d] text-white">
                Create New Journal Entry
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Row 1: Chart (left) + Stats (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart - Takes up ~8 columns on desktop */}
            <div className="lg:col-span-8">
              {mostActiveSymbol ? (
                <TradeCandlestickChart
                  symbol={mostActiveSymbol}
                  executions={chartExecutions}
                  tradeDate={journalData.date}
                  height={400}
                  onExecutionSelect={(execution) => {
                    console.log('Selected execution from chart:', execution);
                    // TODO: Highlight the execution in the table
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

            {/* Stats - Takes up ~4 columns on desktop */}
            <div className="lg:col-span-4">
              <Card className="bg-surface border-default h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-primary">Stats</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-full">
                  <StatsGrid
                    totalExecutions={executionMetrics.totalExecutions}
                    winRate={journalData.winRate}
                    totalVolume={executionMetrics.totalVolume}
                    commissions={journalData.commissions}
                    netPnl={journalData.netPnl || journalData.pnl}
                    className="flex-1"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Row 2: Notes Section (full width) */}
          <Card className="bg-surface border-default">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium text-primary">Notes</CardTitle>
                {saveStatus !== 'idle' && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    saveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                    saveStatus === 'success' ? 'bg-green-100 text-green-700' :
                    saveStatus === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {saveStatus === 'saving' ? 'Saving...' :
                     saveStatus === 'success' ? 'Saved' :
                     saveStatus === 'error' ? 'Error saving' :
                     'Pending save'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 bg-[#16A34A] hover:bg-[#15803d] text-white">
                  Create Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Click here to start typing your notes..."
                className="min-h-[120px] resize-none"
                disabled={isSaving}
              />
              {saveError && (
                <p className="text-sm text-red-600 mt-2">Error: {saveError}</p>
              )}
            </CardContent>
          </Card>

          {/* Row 3: Orders/Executions Table (full width) */}
          <Card className="bg-surface border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-primary">
                Orders ({journalData.executions.length} executions)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExecutionsTable 
                executions={journalData.executions}
                loading={false}
                error={null}
                showActions={true}
                onExecutionSelect={(execution) => {
                  console.log('Selected execution:', execution);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}