'use client';

import React, { useEffect, useState, Suspense } from 'react';
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
import { useRecordsData } from '@/hooks/useRecordsData';
import { useAuth } from '@/contexts/AuthContext';
import TradeCandlestickChart from '@/components/charts/TradeCandlestickChart';
import CalendarYearView from '@/components/CalendarYearView';

function RecordsContent() {
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get('date');
  const selectedTradeId = searchParams.get('tradeId'); // Get specific trade ID if provided
  
  const { isDemo } = useAuth();
  
  // Use real records data instead of mock data
  const { data: recordsData, loading, error, refetch } = useRecordsData(selectedDate);
  
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

  // Local state to track the current notesChanges value (for save button visibility)
  const [localNotesChanges, setLocalNotesChanges] = useState<string>(() => {
    return targetTrade ? (targetTrade.notesChanges || targetTrade.notes || '') 
      : (recordsData?.notesChanges || recordsData?.notes || '');
  });

  // Auto-save notes functionality - saves to notesChanges field
  const autoSaveNotes = async (notes: string) => {
    try {
      const response = await fetch('/api/records/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes, 
          date: selectedDate,
          tradeId: targetTrade?.id, // Pass specific trade ID if available
          saveChanges: false // Auto-save to notesChanges
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to auto-save notes');
      }
      
      // Update local state to reflect that notesChanges now contains the current notes
      setLocalNotesChanges(notes);
    } catch (error) {
      console.error('Error auto-saving notes:', error);
      throw error;
    }
  };

  // Save changes functionality - copies notesChanges to notes
  const saveChanges = async () => {
    try {
      const response = await fetch('/api/records/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes: localNotesChanges || '', 
          date: selectedDate,
          tradeId: targetTrade?.id, // Pass specific trade ID if available
          saveChanges: true // Save changes: copy notesChanges to notes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save changes');
      }
      
      // Update local tracking - now notes and notesChanges are the same
      // This will hide the save button
      setLocalNotesChanges(localNotesChanges || '');
      
      // Refresh records data to get the updated notes state
      refetch();
    } catch (error) {
      console.error('Error saving changes:', error);
      throw error;
    }
  };

  // Get the correct initial notes value from either specific trade or records level
  const getInitialNotes = () => {
    if (targetTrade) {
      return targetTrade.notesChanges || targetTrade.notes || '';
    }
    return recordsData?.notesChanges || recordsData?.notes || '';
  };

  const {
    value: notes,
    setValue: setNotes,
    status: saveStatus,
    isSaving,
    error: saveError
  } = useAutoSave({
    initialValue: getInitialNotes(), // Initialize with the correct notes
    saveFunction: autoSaveNotes, // Use auto-save function that saves to notesChanges
    debounceMs: 3000,
    enabled: !!recordsData // Only enable auto-save when data is loaded
  });

  // Update notes when records data first loads (but don't override user input)
  useEffect(() => {
    const initialValue = targetTrade 
      ? targetTrade.notesChanges || targetTrade.notes || ''
      : recordsData?.notesChanges || recordsData?.notes || '';
    
    if (recordsData && notes === '' && initialValue) {
      setNotes(initialValue);
    }

    // Update local notesChanges tracking when data changes
    setLocalNotesChanges(targetTrade ? (targetTrade.notesChanges || targetTrade.notes || '') 
      : (recordsData?.notesChanges || recordsData?.notes || ''));
  }, [recordsData, targetTrade, notes, setNotes]);

  // Check if there are unsaved changes (notesChanges different from notes)
  const hasUnsavedChanges = () => {
    const savedNotes = targetTrade ? targetTrade.notes : recordsData?.notes;
    return localNotesChanges && localNotesChanges !== (savedNotes || '');
  };

  const shouldShowSaveButton = hasUnsavedChanges();


  // All executions for this records entry
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

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Records" showTimeRangeFilters={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-tertiary)]"></div>
        </div>
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

  // Handle no data case - show calendar year view for trade selection
  if (!recordsData) {
    const currentYear = selectedDate ? new Date(selectedDate).getFullYear() : new Date().getFullYear();
    
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Records" showTimeRangeFilters={false} />
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-primary mb-2">Select a Trading Day</h2>
            <p className="text-muted text-sm">No records found for {selectedDate}. Choose a date from the calendar below to view trading records.</p>
          </div>
          <CalendarYearView year={currentYear} isDemo={isDemo} />
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

            <div className="text-right">
              <Button className="bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white">
                Create New Records Entry
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
                  tradeDate={recordsData.date}
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
                    winRate={recordsData.winRate}
                    totalVolume={executionMetrics.totalVolume}
                    commissions={recordsData.commissions}
                    netPnl={recordsData.netPnl || recordsData.pnl}
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
                {shouldShowSaveButton && (
                  <Button 
                    size="sm" 
                    className="h-8 bg-[var(--theme-green)] hover:bg-[var(--theme-green)]/80 text-white"
                    onClick={saveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
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
                Orders ({recordsData.executions.length} executions)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExecutionsTable 
                executions={recordsData.executions}
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

export default function Records() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full">
        <TopBar title="Records" showTimeRangeFilters={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-tertiary)]"></div>
        </div>
      </div>
    }>
      <RecordsContent />
    </Suspense>
  );
}