'use client';

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, MoreHorizontal, ChevronRight, Share } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Order } from '@prisma/client';

// Extended interface for execution orders with calculated fields
export interface ExecutionOrder extends Order {
  pnl?: number;           // Calculated P&L for this execution
  shared?: boolean;       // Whether this execution has been shared
  notes?: string;         // Notes for this execution
  tags?: string[];        // Tags for this execution
}

interface ExecutionsTableProps {
  executions: ExecutionOrder[];
  loading?: boolean;
  error?: string | null;
  onExecutionSelect?: (execution: ExecutionOrder) => void;
  showActions?: boolean;
}

type SortField = 'orderExecutedTime' | 'symbol' | 'orderQuantity' | 'limitPrice' | 'pnl';
type SortDirection = 'asc' | 'desc';

// Define priority columns for different screen sizes
const PRIORITY_COLUMNS = {
  mobile: ['symbol', 'orderQuantity', 'pnl'],
  tablet: ['orderExecutedTime', 'symbol', 'orderQuantity', 'pnl'],
  desktop: 'all'
};

// Default column configuration
const DEFAULT_COLUMNS = [
  { id: 'orderExecutedTime', label: 'Time', visible: true, sortable: true },
  { id: 'symbol', label: 'Symbol', visible: true, sortable: true },
  { id: 'orderQuantity', label: 'Volume', visible: true, sortable: true },
  { id: 'executions', label: 'Execs', visible: true, sortable: false },
  { id: 'pnl', label: 'P&L', visible: true, sortable: true },
  { id: 'shared', label: 'Shared', visible: true, sortable: false },
  { id: 'notes', label: 'Notes', visible: true, sortable: false },
  { id: 'tags', label: 'Tags', visible: true, sortable: false }
];

export default function ExecutionsTable({ 
  executions, 
  loading = false,
  error = null,
  onExecutionSelect,
  showActions = true 
}: ExecutionsTableProps) {
  const [sortField, setSortField] = useState<SortField>('orderExecutedTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // Media queries
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');

  // Filter columns based on device type
  const getVisibleColumns = () => {
    const allColumns = DEFAULT_COLUMNS.filter(col => col.visible);
    
    if (isMobile) {
      return allColumns.filter(col => PRIORITY_COLUMNS.mobile.includes(col.id));
    } else if (isTablet) {
      return allColumns.filter(col => PRIORITY_COLUMNS.tablet.includes(col.id));
    }
    
    return allColumns;
  };
  
  const visibleColumns = getVisibleColumns();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedExecutions = useMemo(() => {
    return [...executions].sort((a, b) => {
      let aValue: string | number | Date = '';
      let bValue: string | number | Date = '';

      switch (sortField) {
        case 'orderExecutedTime':
          aValue = a.orderExecutedTime ? new Date(a.orderExecutedTime).getTime() : 0;
          bValue = b.orderExecutedTime ? new Date(b.orderExecutedTime).getTime() : 0;
          break;
        case 'symbol':
          aValue = a.symbol || '';
          bValue = b.symbol || '';
          break;
        case 'orderQuantity':
          aValue = a.orderQuantity || 0;
          bValue = b.orderQuantity || 0;
          break;
        case 'limitPrice':
          aValue = Number(a.limitPrice) || 0;
          bValue = Number(b.limitPrice) || 0;
          break;
        case 'pnl':
          aValue = a.pnl || 0;
          bValue = b.pnl || 0;
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [executions, sortField, sortDirection]);
  
  const toggleRowExpansion = (executionId: string) => {
    setExpandedRows(prev => 
      prev.includes(executionId) 
        ? prev.filter(id => id !== executionId)
        : [...prev, executionId]
    );
  };

  const formatTime = (dateTime: Date | null) => {
    if (!dateTime) return '-';
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatPnL = (pnl: number | undefined) => {
    if (pnl === undefined || pnl === null) return '-';
    const formatted = `$${Math.abs(pnl).toFixed(2)}`;
    return pnl >= 0 ? formatted : `-${formatted}`;
  };

  // Function to render cell content based on column ID
  const renderCellContent = (execution: ExecutionOrder, columnId: string) => {
    switch (columnId) {
      case 'orderExecutedTime':
        return (
          <TableCell className="text-sm text-primary font-medium whitespace-nowrap">
            {formatTime(execution.orderExecutedTime)}
          </TableCell>
        );
      case 'symbol':
        return (
          <TableCell className="text-sm font-medium text-primary">
            {execution.symbol}
          </TableCell>
        );
      case 'orderQuantity':
        return (
          <TableCell className="text-sm text-primary">
            {execution.orderQuantity.toLocaleString()}
          </TableCell>
        );
      case 'executions':
        return (
          <TableCell className="text-sm text-primary">
            1
          </TableCell>
        );
      case 'pnl':
        return (
          <TableCell className={cn(
            'text-sm font-medium whitespace-nowrap',
            (execution.pnl || 0) >= 0 ? 'text-positive' : 'text-negative'
          )}>
            {formatPnL(execution.pnl)}
          </TableCell>
        );
      case 'shared':
        return (
          <TableCell className="text-sm text-center">
            {execution.shared && (
              <Share className="h-4 w-4 text-muted mx-auto" />
            )}
          </TableCell>
        );
      case 'notes':
        return (
          <TableCell className="text-sm text-muted max-w-[200px] truncate">
            {execution.notes || ''}
          </TableCell>
        );
      case 'tags':
        return (
          <TableCell>
            <div className="flex gap-1 flex-wrap">
              {execution.tags?.slice(0, 2).map((tag) => (
                <span 
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
              {(execution.tags?.length || 0) > 2 && (
                <span className="text-xs text-muted">
                  +{(execution.tags?.length || 0) - 2} more
                </span>
              )}
            </div>
          </TableCell>
        );
      default:
        return (
          <TableCell className="text-sm text-muted">
            -
          </TableCell>
        );
    }
  };
  
  // Render expanded row details for mobile
  const renderExpandedDetails = (execution: ExecutionOrder) => {
    const hiddenColumns = DEFAULT_COLUMNS.filter(col => 
      col.visible && !visibleColumns.find(vc => vc.id === col.id)
    );
    
    if (hiddenColumns.length === 0) return null;
    
    return (
      <TableRow>
        <TableCell colSpan={visibleColumns.length + (isMobile ? 1 : 0) + (showActions ? 1 : 0)}>
          <div className="px-4 py-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {hiddenColumns.map(col => (
                <div key={col.id}>
                  <span className="text-muted font-medium">{col.label}:</span>
                  <span className="ml-2 text-primary">
                    {col.id === 'orderExecutedTime' ? (
                      formatTime(execution.orderExecutedTime)
                    ) : col.id === 'pnl' ? (
                      <span className={cn(
                        'font-medium',
                        (execution.pnl || 0) >= 0 ? 'text-positive' : 'text-negative'
                      )}>
                        {formatPnL(execution.pnl)}
                      </span>
                    ) : col.id === 'orderQuantity' ? (
                      execution.orderQuantity.toLocaleString()
                    ) : col.id === 'shared' ? (
                      execution.shared ? 'Yes' : 'No'
                    ) : col.id === 'tags' ? (
                      execution.tags?.join(', ') || '-'
                    ) : col.id === 'executions' ? (
                      '1'
                    ) : (
                      (execution as any)[col.id] || '-'
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
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
  const totals = useMemo(() => {
    return executions.reduce((acc, execution) => ({
      executions: acc.executions + 1,
      volume: acc.volume + execution.orderQuantity,
      pnl: acc.pnl + (execution.pnl || 0)
    }), { executions: 0, volume: 0, pnl: 0 });
  }, [executions]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface border border-default rounded-lg">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-default">
                {isMobile && <TableHead className="w-8"></TableHead>}
                {visibleColumns.map((column) => (
                  <TableHead key={column.id} className="text-xs font-medium text-muted uppercase">
                    {column.label}
                  </TableHead>
                ))}
                {showActions && !isMobile && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {isMobile && <TableCell className="w-8"></TableCell>}
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </TableCell>
                  ))}
                  {showActions && !isMobile && <TableCell></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-surface border border-default rounded-lg p-8 text-center">
        <p className="text-negative font-medium">Error loading executions</p>
        <p className="text-muted text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Empty state
  if (executions.length === 0) {
    return (
      <div className="bg-surface border border-default rounded-lg p-8 text-center">
        <p className="text-muted font-medium">No executions found</p>
        <p className="text-muted text-sm mt-1">There are no order executions for this trade yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-default rounded-lg">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-default">
              {isMobile && (
                <TableHead className="w-8"></TableHead>
              )}
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.id} 
                  className="text-xs font-medium text-muted uppercase"
                >
                  {column.sortable ? (
                    <SortButton field={column.id as SortField}>{column.label}</SortButton>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              {showActions && !isMobile && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedExecutions.map((execution) => (
              <React.Fragment key={execution.id}>
                <TableRow 
                  className="hover:bg-gray-50 border-b border-default cursor-pointer"
                  onClick={() => !isMobile && onExecutionSelect?.(execution)}
                >
                  {isMobile && (
                    <TableCell className="w-8">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpansion(execution.id);
                        }}
                        className="p-1"
                      >
                        <ChevronRight 
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedRows.includes(execution.id) && "rotate-90"
                          )}
                        />
                      </button>
                    </TableCell>
                  )}
                  {visibleColumns.map((column) => {
                    const cellContent = renderCellContent(execution, column.id);
                    return <React.Fragment key={column.id}>{cellContent}</React.Fragment>;
                  })}
                  {showActions && !isMobile && (
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
                {isMobile && expandedRows.includes(execution.id) && renderExpandedDetails(execution)}
              </React.Fragment>
            ))}
            
            {/* Totals Row - Hidden on mobile */}
            {!isMobile && (
              <TableRow className="bg-gray-50 border-t-2 border-default font-medium hover:bg-gray-50">
                {visibleColumns.map((column, index) => {
                  // For the first column, show "TOTAL:"
                  if (index === 0) {
                    return (
                      <TableCell key={column.id} className="text-sm font-semibold text-primary">
                        TOTAL:
                      </TableCell>
                    );
                  }
                  
                  // For other columns, show the appropriate total or empty cell
                  switch (column.id) {
                    case 'symbol':
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-primary">
                          {totals.executions} exec{totals.executions !== 1 ? 's' : ''}
                        </TableCell>
                      );
                    case 'orderQuantity':
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-primary">
                          {totals.volume.toLocaleString()}
                        </TableCell>
                      );
                    case 'executions':
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-primary">
                          {totals.executions}
                        </TableCell>
                      );
                    case 'pnl':
                      return (
                        <TableCell key={column.id} className={cn(
                          'text-sm font-semibold',
                          totals.pnl >= 0 ? 'text-positive' : 'text-negative'
                        )}>
                          {formatPnL(totals.pnl)}
                        </TableCell>
                      );
                    default:
                      return <TableCell key={column.id}></TableCell>;
                  }
                })}
                {showActions && <TableCell></TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Mobile Totals Summary */}
      {isMobile && (
        <div className="p-4 border-t border-default bg-gray-50">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted">Total Executions:</span>
              <span className="ml-2 font-semibold">{totals.executions}</span>
            </div>
            <div>
              <span className="text-muted">Total Volume:</span>
              <span className="ml-2 font-semibold">{totals.volume.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted">Total P&L:</span>
              <span className={cn(
                'ml-2 font-semibold',
                totals.pnl >= 0 ? 'text-positive' : 'text-negative'
              )}>
                {formatPnL(totals.pnl)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}