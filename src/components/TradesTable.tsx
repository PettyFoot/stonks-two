'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trade, ColumnConfiguration } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';

interface TradesTableProps {
  trades: Trade[];
  showCheckboxes?: boolean;
  showPagination?: boolean;
  onTradeSelect?: (trade: Trade) => void;
  columnConfig?: ColumnConfiguration[];
}

type SortField = 'date' | 'time' | 'symbol' | 'volume' | 'executions' | 'pnl';
type SortDirection = 'asc' | 'desc';

export default function TradesTable({ 
  trades, 
  showCheckboxes = true, 
  onTradeSelect,
  columnConfig = []
}: TradesTableProps) {
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Define default column configuration
  const defaultColumns: ColumnConfiguration[] = [
    { id: 'date', label: 'Date', visible: true, sortable: true },
    { id: 'time', label: 'Time', visible: true, sortable: true },
    { id: 'symbol', label: 'Symbol', visible: true, sortable: true },
    { id: 'volume', label: 'Volume', visible: true, sortable: true },
    { id: 'executions', label: 'Executions', visible: true, sortable: true },
    { id: 'pnl', label: 'P&L', visible: true, sortable: true },
    { id: 'notes', label: 'Notes', visible: true, sortable: false },
    { id: 'tags', label: 'Tags', visible: true, sortable: false }
  ];

  // Use column config from props, localStorage, or default
  const getEffectiveColumns = () => {
    if (columnConfig.length > 0) {
      return columnConfig;
    }
    
    const savedColumns = localStorage.getItem('trades-column-settings');
    if (savedColumns) {
      try {
        return JSON.parse(savedColumns) as ColumnConfiguration[];
      } catch {
        return defaultColumns;
      }
    }
    
    return defaultColumns;
  };

  const effectiveColumns = getEffectiveColumns();
  const visibleColumns = effectiveColumns.filter(col => col.visible);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTrades = React.useMemo(() => {
    return [...trades].sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      // Handle time sorting
      if (sortField === 'time') {
        aValue = new Date(`2000-01-01 ${a.time}`).getTime();
        bValue = new Date(`2000-01-01 ${b.time}`).getTime();
      }

      // Handle date sorting
      if (sortField === 'date') {
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trades, sortField, sortDirection]);

  const handleSelectTrade = (tradeId: string, checked: boolean) => {
    if (checked) {
      setSelectedTrades([...selectedTrades, tradeId]);
    } else {
      setSelectedTrades(selectedTrades.filter(id => id !== tradeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTrades(trades.map(t => t.id));
    } else {
      setSelectedTrades([]);
    }
  };

  const formatPnL = (pnl: number) => {
    const formatted = `$${Math.abs(pnl).toFixed(2)}`;
    return pnl >= 0 ? formatted : `-${formatted}`;
  };

  // Function to render cell content based on column ID
  const renderCellContent = (trade: Trade, columnId: string) => {
    const cellStyle = needsHorizontalScroll ? { 
      minWidth: `calc(${baseColumnWidth} - 2px)`,
      width: `calc(${baseColumnWidth} - 2px)`
    } : { width: baseColumnWidth };
    switch (columnId) {
      case 'date':
        return (
          <TableCell className="text-sm text-primary font-medium" style={cellStyle}>
            {trade.date}
          </TableCell>
        );
      case 'time':
        return (
          <TableCell className="text-sm text-muted" style={cellStyle}>
            {trade.time}
          </TableCell>
        );
      case 'symbol':
        return (
          <TableCell className="text-sm font-medium text-primary" style={cellStyle}>
            {trade.symbol}
          </TableCell>
        );
      case 'volume':
        return (
          <TableCell className="text-sm text-primary" style={cellStyle}>
            {(trade.quantity || 0).toLocaleString()}
          </TableCell>
        );
      case 'executions':
        return (
          <TableCell className="text-sm text-primary" style={cellStyle}>
            {trade.executions || 0}
          </TableCell>
        );
      case 'pnl':
        return (
          <TableCell className={cn(
            'text-sm font-medium',
            (trade.pnl || 0) >= 0 ? 'text-positive' : 'text-negative'
          )} style={cellStyle}>
            {formatPnL(trade.pnl || 0)}
          </TableCell>
        );
      case 'notes':
        return (
          <TableCell className="text-sm text-muted" style={cellStyle}>
            {trade.notes || ''}
          </TableCell>
        );
      case 'tags':
        return (
          <TableCell style={cellStyle}>
            <div className="flex gap-1">
              {trade.tags?.slice(0, 2).map((tag) => (
                <span 
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </TableCell>
        );
      default:
        return (
          <TableCell className="text-sm text-muted" style={cellStyle}>
            -
          </TableCell>
        );
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left font-medium text-primary hover:text-primary/80"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? 
        <ChevronUp className="h-3 w-3" /> : 
        <ChevronDown className="h-3 w-3" />
      )}
    </button>
  );

  // Calculate totals
  const totals = React.useMemo(() => {
    return trades.reduce((acc, trade) => ({
      trades: acc.trades + 1,
      volume: acc.volume + (trade.quantity || 0),
      executions: acc.executions + (trade.executions || 0),
      pnl: acc.pnl + (trade.pnl || 0)
    }), { trades: 0, volume: 0, executions: 0, pnl: 0 });
  }, [trades]);

  // Calculate if we need horizontal scrolling
  const needsHorizontalScroll = visibleColumns.length > 7;
  
  // Calculate column width for even distribution up to 7 columns
  const baseColumnWidth = needsHorizontalScroll ? `${100 / 7}%` : `${100 / visibleColumns.length}%`;

  return (
    <div className="bg-surface border border-default rounded-lg">
      <div className={needsHorizontalScroll ? "overflow-x-auto" : ""}>
        <Table className={needsHorizontalScroll ? "min-w-max" : "w-full"}>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-default">
            {showCheckboxes && (
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedTrades.length === trades.length && trades.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {visibleColumns.map((column, index) => (
              <TableHead 
                key={column.id} 
                className="text-xs font-medium text-muted uppercase"
                style={needsHorizontalScroll ? { 
                  minWidth: `calc(${baseColumnWidth} - 2px)`,
                  width: `calc(${baseColumnWidth} - 2px)`
                } : { width: baseColumnWidth }}
              >
                {column.sortable ? (
                  <SortButton field={column.id as SortField}>{column.label}</SortButton>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTrades.map((trade) => (
            <TableRow 
              key={trade.id} 
              className="hover:bg-gray-50 border-b border-default cursor-pointer"
              onClick={() => onTradeSelect?.(trade)}
            >
              {showCheckboxes && (
                <TableCell>
                  <Checkbox 
                    checked={selectedTrades.includes(trade.id)}
                    onCheckedChange={(checked) => handleSelectTrade(trade.id, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
              )}
              {visibleColumns.map((column) => 
                <React.Fragment key={column.id}>
                  {renderCellContent(trade, column.id)}
                </React.Fragment>
              )}
              <TableCell>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          
          {/* Totals Row */}
          <TableRow className="bg-gray-50 border-t-2 border-default font-medium hover:bg-gray-50">
            {showCheckboxes && <TableCell></TableCell>}
            <TableCell colSpan={2} className="text-sm font-semibold text-primary">
              TOTAL:
            </TableCell>
            <TableCell className="text-sm font-semibold text-primary">
              {totals.trades} trades
            </TableCell>
            <TableCell className="text-sm font-semibold text-primary">
              {totals.volume.toLocaleString()}
            </TableCell>
            <TableCell className="text-sm font-semibold text-primary">
              {totals.executions}
            </TableCell>
            <TableCell className={cn(
              'text-sm font-semibold',
              totals.pnl >= 0 ? 'text-positive' : 'text-negative'
            )}>
              {formatPnL(totals.pnl)}
            </TableCell>
            <TableCell colSpan={4}></TableCell>
          </TableRow>
        </TableBody>
        </Table>
      </div>
    </div>
  );
}