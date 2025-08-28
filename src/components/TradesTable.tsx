'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trade, ColumnConfiguration } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, MoreHorizontal, ChevronRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRouter } from 'next/navigation';

interface TradesTableProps {
  trades: Trade[];
  showCheckboxes?: boolean;
  showPagination?: boolean;
  onTradeSelect?: (trade: Trade) => void;
  columnConfig?: ColumnConfiguration[];
}

type SortField = 'date' | 'time' | 'symbol' | 'side' | 'holdingPeriod' | 'entryPrice' | 'exitPrice' | 'volume' | 'executions' | 'pnl';
type SortDirection = 'asc' | 'desc';

// Define priority columns for different screen sizes
const PRIORITY_COLUMNS = {
  mobile: ['symbol', 'pnl', 'date'],
  tablet: ['date', 'symbol', 'volume', 'pnl', 'time'],
  desktop: 'all'
};

export default function TradesTable({ 
  trades, 
  showCheckboxes = true, 
  onTradeSelect,
  columnConfig = []
}: TradesTableProps) {
  const router = useRouter();
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // Media queries
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const _isDesktop = useMediaQuery('(min-width: 1024px)');

  // Define default column configuration
  const defaultColumns: ColumnConfiguration[] = [
    { id: 'date', label: 'Date', visible: true, sortable: true },
    { id: 'time', label: 'Time', visible: true, sortable: true },
    { id: 'symbol', label: 'Symbol', visible: true, sortable: true },
    { id: 'side', label: 'Side', visible: true, sortable: true },
    { id: 'holdingPeriod', label: 'Duration', visible: true, sortable: true },
    { id: 'entryPrice', label: 'Entry Price', visible: true, sortable: true },
    { id: 'exitPrice', label: 'Exit Price', visible: true, sortable: true },
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
    
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem('trades-column-settings');
      if (savedColumns) {
        try {
          return JSON.parse(savedColumns) as ColumnConfiguration[];
        } catch {
          return defaultColumns;
        }
      }
    }
    
    return defaultColumns;
  };

  const effectiveColumns = getEffectiveColumns();
  
  // Filter columns based on device type
  const getVisibleColumns = () => {
    const allColumns = effectiveColumns.filter(col => col.visible);
    
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

  const sortedTrades = React.useMemo(() => {
    return [...trades].sort((a, b) => {
      let aValue: string | number = a[sortField] ?? '';
      let bValue: string | number = b[sortField] ?? '';

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
  
  const toggleRowExpansion = (tradeId: string) => {
    setExpandedRows(prev => 
      prev.includes(tradeId) 
        ? prev.filter(id => id !== tradeId)
        : [...prev, tradeId]
    );
  };

  // Navigate to records page with selected trade's date
  const handleTradeClick = (trade: Trade) => {
    router.push(`/records?date=${trade.date}`);
  };

  const formatPnL = (pnl: number) => {
    const formatted = `$${Math.abs(pnl).toFixed(2)}`;
    return pnl >= 0 ? formatted : `-${formatted}`;
  };

  // Function to render cell content based on column ID
  const renderCellContent = (trade: Trade, columnId: string) => {
    switch (columnId) {
      case 'date':
        return (
          <TableCell className="text-sm text-primary font-medium whitespace-nowrap">
            {trade.date}
          </TableCell>
        );
      case 'time':
        return (
          <TableCell className="text-sm text-muted whitespace-nowrap">
            {trade.time}
          </TableCell>
        );
      case 'symbol':
        return (
          <TableCell className="text-sm font-medium text-primary">
            {trade.symbol}
          </TableCell>
        );
      case 'side':
        return (
          <TableCell className={cn(
            'text-sm font-medium uppercase',
            trade.side === 'long' ? 'text-positive' : 'text-negative'
          )}>
            {trade.side || '-'}
          </TableCell>
        );
      case 'holdingPeriod':
        return (
          <TableCell className="text-sm text-primary">
            {trade.holdingPeriod ? (
              trade.holdingPeriod === 'INTRADAY' ? 'Intraday' :
              trade.holdingPeriod === 'SWING' ? 'Swing' :
              trade.holdingPeriod === 'SCALP' ? 'Scalp' :
              trade.holdingPeriod === 'POSITION' ? 'Position' :
              trade.holdingPeriod === 'LONG_TERM' ? 'Long Term' :
              trade.holdingPeriod
            ) : '-'}
          </TableCell>
        );
      case 'entryPrice':
        return (
          <TableCell className="text-sm text-primary">
            {trade.entryPrice != null ? `$${Number(trade.entryPrice).toFixed(2)}` : '-'}
          </TableCell>
        );
      case 'exitPrice':
        return (
          <TableCell className="text-sm text-primary">
            {trade.exitPrice != null ? `$${Number(trade.exitPrice).toFixed(2)}` : '-'}
          </TableCell>
        );
      case 'volume':
        return (
          <TableCell className="text-sm text-primary">
            {(trade.quantity || 0).toLocaleString()}
          </TableCell>
        );
      case 'executions':
        return (
          <TableCell className="text-sm text-primary">
            {trade.executions || 0}
          </TableCell>
        );
      case 'pnl':
        return (
          <TableCell className={cn(
            'text-sm font-medium whitespace-nowrap',
            (trade.pnl || 0) >= 0 ? 'text-positive' : 'text-negative'
          )}>
            {formatPnL(trade.pnl || 0)}
          </TableCell>
        );
      case 'notes':
        return (
          <TableCell className="text-sm text-muted max-w-[200px] truncate">
            {trade.notes || ''}
          </TableCell>
        );
      case 'tags':
        return (
          <TableCell>
            <div className="flex gap-1 flex-wrap">
              {trade.tags?.slice(0, 2).map((tag) => (
                <span 
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary text-primary"
                >
                  {tag}
                </span>
              ))}
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
  const renderExpandedDetails = (trade: Trade) => {
    const hiddenColumns = effectiveColumns.filter(col => 
      col.visible && !visibleColumns.find(vc => vc.id === col.id)
    );
    
    if (hiddenColumns.length === 0) return null;
    
    return (
      <TableRow>
        <TableCell colSpan={visibleColumns.length + (showCheckboxes ? 1 : 0) + (isMobile ? 1 : 2)}>
          <div className="px-4 py-3 bg-surface rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {hiddenColumns.map(col => (
                <div key={col.id}>
                  <span className="text-muted font-medium">{col.label}:</span>
                  <span className="ml-2 text-primary">
                    {col.id === 'pnl' ? (
                      <span className={cn(
                        'font-medium',
                        (trade.pnl || 0) >= 0 ? 'text-positive' : 'text-negative'
                      )}>
                        {formatPnL(trade.pnl || 0)}
                      </span>
                    ) : col.id === 'volume' ? (
                      (trade.quantity || 0).toLocaleString()
                    ) : col.id === 'tags' ? (
                      trade.tags?.join(', ') || '-'
                    ) : (
                      trade[col.id as keyof Trade] || '-'
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
  const totals = React.useMemo(() => {
    return trades.reduce((acc, trade) => ({
      trades: acc.trades + 1,
      volume: acc.volume + (trade.quantity || 0),
      executions: acc.executions + (trade.executions || 0),
      pnl: acc.pnl + (trade.pnl || 0)
    }), { trades: 0, volume: 0, executions: 0, pnl: 0 });
  }, [trades]);

  return (
    <div className="bg-surface border border-default rounded-lg">
      <div className="overflow-x-auto">
        <Table className="w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-default">
            {showCheckboxes && !isMobile && (
              <TableHead className="w-12 sticky left-0 bg-surface z-10">
                <Checkbox 
                  checked={selectedTrades.length === trades.length && trades.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {isMobile && (
              <TableHead className="w-8"></TableHead>
            )}
            {visibleColumns.map((column, index) => (
              <TableHead 
                key={column.id} 
                className={cn(
                  "text-xs font-medium text-muted uppercase",
                  index === 0 && !showCheckboxes && "sticky left-0 bg-surface z-10"
                )}
              >
                {column.sortable ? (
                  <SortButton field={column.id as SortField}>{column.label}</SortButton>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
            {!isMobile && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTrades.map((trade) => (
            <React.Fragment key={trade.id}>
              <TableRow 
                className="hover:bg-surface/50 border-b border-default cursor-pointer"
                onClick={() => {
                  // Call existing onTradeSelect callback if provided
                  onTradeSelect?.(trade);
                  // Navigate to records page
                  handleTradeClick(trade);
                }}
              >
                {showCheckboxes && !isMobile && (
                  <TableCell className="sticky left-0 bg-inherit z-10">
                    <Checkbox 
                      checked={selectedTrades.includes(trade.id)}
                      onCheckedChange={(checked) => handleSelectTrade(trade.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                {isMobile && (
                  <TableCell className="w-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowExpansion(trade.id);
                      }}
                      className="p-1"
                    >
                      <ChevronRight 
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedRows.includes(trade.id) && "rotate-90"
                        )}
                      />
                    </button>
                  </TableCell>
                )}
                {visibleColumns.map((column, index) => {
                  const cellContent = renderCellContent(trade, column.id);
                  if (index === 0 && !showCheckboxes && !isMobile) {
                    return (
                      <React.Fragment key={column.id}>
                        {React.cloneElement(cellContent as React.ReactElement<{className?: string}>, {
                          className: cn(
                            (cellContent as React.ReactElement<{className?: string}>).props?.className,
                            "sticky left-0 bg-inherit z-10"
                          )
                        })}
                      </React.Fragment>
                    );
                  }
                  return <React.Fragment key={column.id}>{cellContent}</React.Fragment>;
                })}
                {!isMobile && (
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
              {isMobile && expandedRows.includes(trade.id) && renderExpandedDetails(trade)}
            </React.Fragment>
          ))}
          
          {/* Totals Row - Hidden on mobile */}
          {!isMobile && (
            <TableRow className="bg-surface border-t-2 border-default font-medium hover:bg-surface">
              {showCheckboxes && <TableCell className="sticky left-0 bg-surface z-10"></TableCell>}
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
                        {totals.trades} trades
                      </TableCell>
                    );
                  case 'volume':
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
              <TableCell></TableCell>
            </TableRow>
          )}
        </TableBody>
        </Table>
      </div>
      
      {/* Mobile Totals Summary */}
      {isMobile && (
        <div className="p-4 border-t border-default bg-surface">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted">Total Trades:</span>
              <span className="ml-2 font-semibold">{totals.trades}</span>
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