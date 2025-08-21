'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnConfiguration } from '@/types';
import { Settings } from 'lucide-react';

interface ColumnSettingsModalProps {
  onColumnsChange: (columns: ColumnConfiguration[]) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export default function ColumnSettingsModal({
  onColumnsChange,
  trigger,
  className = ''
}: ColumnSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<ColumnConfiguration[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<ColumnConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load available columns and user preferences
  useEffect(() => {
    async function loadColumns() {
      try {
        setLoading(true);
        
        // Fetch available columns from API
        const response = await fetch('/api/trades/columns');
        if (!response.ok) {
          throw new Error('Failed to fetch columns');
        }
        
        const data = await response.json();
        const columns = data.columns as ColumnConfiguration[];
        
        // Load user preferences from localStorage
        if (typeof window !== 'undefined') {
          const savedColumns = localStorage.getItem('trades-column-settings');
          if (savedColumns) {
            try {
              const userColumns = JSON.parse(savedColumns) as ColumnConfiguration[];
              // Merge with available columns to handle new columns
              const mergedColumns = columns.map(col => {
                const userCol = userColumns.find(uc => uc.id === col.id);
                return userCol ? { ...col, visible: userCol.visible } : col;
              });
              setAvailableColumns(mergedColumns);
              setSelectedColumns(mergedColumns);
              return;
            } catch {
              // Fall through to default behavior
            }
          }
        }
        
        // Default behavior when localStorage is not available or empty
        setAvailableColumns(columns);
        setSelectedColumns(columns);
      } catch (error) {
        console.error('Failed to load column settings:', error);
        // Fallback to default columns
        const defaultColumns: ColumnConfiguration[] = [
          { id: 'date', label: 'Date', visible: true, sortable: true },
          { id: 'time', label: 'Time', visible: true, sortable: true },
          { id: 'symbol', label: 'Symbol', visible: true, sortable: true },
          { id: 'volume', label: 'Volume', visible: true, sortable: true },
          { id: 'executions', label: 'Executions', visible: true, sortable: true },
          { id: 'pnl', label: 'P&L', visible: true, sortable: true },
          { id: 'shared', label: 'Shared', visible: true, sortable: false },
          { id: 'notes', label: 'Notes', visible: true, sortable: false },
          { id: 'tags', label: 'Tags', visible: true, sortable: false }
        ];
        setAvailableColumns(defaultColumns);
        setSelectedColumns(defaultColumns);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadColumns();
    }
  }, [isOpen]);

  const handleColumnToggle = (columnId: string, visible: boolean) => {
    const updatedColumns = selectedColumns.map(col =>
      col.id === columnId ? { ...col, visible } : col
    );
    setSelectedColumns(updatedColumns);
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    const allSelected = selectedColumns.every(col => col.visible);
    const updatedColumns = selectedColumns.map(col => ({ ...col, visible: !allSelected }));
    setSelectedColumns(updatedColumns);
    setHasChanges(true);
  };

  const handleReset = () => {
    const resetColumns = availableColumns.map(col => ({ ...col, visible: col.visible }));
    setSelectedColumns(resetColumns);
    setHasChanges(false);
  };

  const handleSetToDefaults = () => {
    const defaultVisibleColumns = ['date', 'time', 'symbol', 'volume', 'executions', 'pnl'];
    const defaultColumns = selectedColumns.map(col => ({
      ...col,
      visible: defaultVisibleColumns.includes(col.id)
    }));
    setSelectedColumns(defaultColumns);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('trades-column-settings', JSON.stringify(selectedColumns));
    }
    
    // Notify parent component
    onColumnsChange(selectedColumns);
    
    setHasChanges(false);
    setIsOpen(false);
  };

  const visibleCount = selectedColumns.filter(col => col.visible).length;
  const allSelected = selectedColumns.every(col => col.visible);
  const noneSelected = selectedColumns.every(col => !col.visible);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className={`h-8 ${className}`}>
      <Settings className="h-3 w-3" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Column Settings</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                {visibleCount} of {selectedColumns.length} columns visible
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSetToDefaults}
                  className="text-xs"
                >
                  Set to Defaults
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                  disabled={!hasChanges}
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Column list */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {selectedColumns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md"
                >
                  <Checkbox
                    checked={column.visible}
                    onCheckedChange={(checked) => handleColumnToggle(column.id, !!checked)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{column.label}</span>
                    {column.sortable && (
                      <span className="ml-2 text-xs text-muted">(sortable)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Warning for no columns */}
            {noneSelected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ At least one column should be visible for the table to display properly.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={noneSelected}
                className="bg-[#16A34A] hover:bg-[#15803d] text-white"
                size="sm"
              >
                Apply Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}