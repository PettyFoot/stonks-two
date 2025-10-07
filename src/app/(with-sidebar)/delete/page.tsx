'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import TradesTable from '@/components/TradesTable';
import { Trade } from '@/types';
import { useTradesData } from '@/hooks/useTradesData';
import { FullPageTriangleLoader } from '@/components/ui/TriangleLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DeleteTrades() {
  const router = useRouter();
  const { isDemo } = useAuth();
  const { data: tradesData, loading, error, refetch } = useTradesData();
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [affectedTrades, setAffectedTrades] = useState<any[]>([]);
  const [conflictDetails, setConflictDetails] = useState<any>(null);

  const trades = tradesData?.trades || [];

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedTrades(newSelection);
  };

  const handleDeleteClick = () => {
    if (selectedTrades.length === 0) {
      return;
    }
    setDeleteError(null);
    setAffectedTrades([]);
    setConflictDetails(null);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/trades/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tradeIds: selectedTrades }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Shared order conflict - log full details for debugging
          console.group('🔴 DELETION CONFLICT DETECTED');
          console.log('Selected Trade IDs:', selectedTrades);
          console.log('Shared Order Count:', data.sharedOrderCount);
          console.log('Total Conflicting Trades:', data.totalConflictingTrades);
          console.log('All Affected Trade IDs:', data.allAffectedTradeIds);
          console.log('Shared Order IDs:', data.sharedOrderIds);
          console.log('Conflict Details:', data.conflictDetails);
          console.groupEnd();

          setDeleteError(
            `Cannot delete: ${data.sharedOrderCount} order(s) are shared with ${data.totalConflictingTrades} other trade(s). ` +
            `You must also select ALL ${data.totalConflictingTrades} conflicting trade(s).`
          );
          setAffectedTrades(data.affectedTrades || []);
          setConflictDetails(data);
        } else {
          setDeleteError(data.error || 'Failed to delete trades');
        }
        setIsDeleting(false);
        return;
      }

      // Success!
      setShowConfirmDialog(false);
      setSelectedTrades([]);

      // Refetch trades data
      await refetch();

      // Show success message briefly, then navigate back
      setTimeout(() => {
        router.push('/trades');
      }, 1000);

    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setDeleteError(null);
    setAffectedTrades([]);
  };

  if (loading) {
    return (
      <div className="relative h-screen">
        <FullPageTriangleLoader text="Loading trades..." />
      </div>
    );
  }

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
        title="Delete Trades"
        showTimeRangeFilters={false}
      />

      <FilterPanel
        showAdvanced={true}
        demo={isDemo}
      />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-primary">
                  Select Trades to Delete
                </h2>
                <p className="text-sm text-muted">
                  {selectedTrades.length} {selectedTrades.length === 1 ? 'trade' : 'trades'} selected
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/trades')}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteClick}
                  disabled={selectedTrades.length === 0}
                  size="sm"
                  className={selectedTrades.length > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>

            {/* Warning banner */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Warning: This action cannot be undone
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Deleting trades will also delete all associated orders. If any order is shared
                    with other trades, you must select all those trades for deletion as well.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trades Table with checkboxes */}
        <TradesTable
          trades={trades}
          showCheckboxes={true}
          showPagination={true}
          externalSelectedTrades={selectedTrades}
          onSelectionChange={handleSelectionChange}
        />
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-[30vw]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm">
              You are about to delete <strong>{selectedTrades.length}</strong> trade{selectedTrades.length !== 1 ? 's' : ''}.
            </p>

            {deleteError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                      Cannot Delete
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      {deleteError}
                    </p>

                    {affectedTrades.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Missing trades that must also be selected:
                        </p>
                        <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                          {affectedTrades.map((trade) => (
                            <li key={trade.id} className="font-mono text-xs">
                              • {trade.symbol} - {new Date(trade.date).toLocaleDateString()}
                              <br />
                              <span className="text-red-600 dark:text-red-400 ml-3">
                                Trade ID: {trade.id}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {conflictDetails && (
                          <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono">
                            <p className="font-semibold mb-1">Debug Info:</p>
                            <p>• You selected: {conflictDetails.selectedTradeIds?.length} trades</p>
                            <p>• Missing: {conflictDetails.totalConflictingTrades} trades</p>
                            <p>• Shared orders: {conflictDetails.sharedOrderCount}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting || !!deleteError}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
