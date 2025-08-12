'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trade } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';

interface TradesTableProps {
  trades: Trade[];
  showCheckboxes?: boolean;
  showPagination?: boolean;
  onTradeSelect?: (trade: Trade) => void;
}

type SortField = 'date' | 'time' | 'symbol' | 'volume' | 'executions' | 'pnl';
type SortDirection = 'asc' | 'desc';

export default function TradesTable({ 
  trades, 
  showCheckboxes = true, 
  showPagination = false,
  onTradeSelect 
}: TradesTableProps) {
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
      volume: acc.volume + trade.volume,
      executions: acc.executions + trade.executions,
      pnl: acc.pnl + trade.pnl
    }), { trades: 0, volume: 0, executions: 0, pnl: 0 });
  }, [trades]);

  return (
    <div className="bg-surface border border-default rounded-lg">
      <Table>
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
            <TableHead className="text-xs font-medium text-muted uppercase">
              <SortButton field="date">Date</SortButton>
            </TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">
              <SortButton field="time">Time</SortButton>
            </TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">
              <SortButton field="symbol">Symbol</SortButton>
            </TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">
              <SortButton field="volume">Volume</SortButton>
            </TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">
              <SortButton field="executions">Executions</SortButton>
            </TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">
              <SortButton field="pnl">P&L</SortButton>
            </TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">Shared</TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">Notes</TableHead>
            <TableHead className="text-xs font-medium text-muted uppercase">Tags</TableHead>
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
              <TableCell className="text-sm text-primary font-medium">
                {trade.date}
              </TableCell>
              <TableCell className="text-sm text-muted">
                {trade.time}
              </TableCell>
              <TableCell className="text-sm font-medium text-primary">
                {trade.symbol}
              </TableCell>
              <TableCell className="text-sm text-primary">
                {trade.volume.toLocaleString()}
              </TableCell>
              <TableCell className="text-sm text-primary">
                {trade.executions}
              </TableCell>
              <TableCell className={cn(
                'text-sm font-medium',
                trade.pnl >= 0 ? 'text-positive' : 'text-negative'
              )}>
                {formatPnL(trade.pnl)}
              </TableCell>
              <TableCell className="text-sm text-muted">
                {trade.shared ? '✓' : ''}
              </TableCell>
              <TableCell className="text-sm text-muted">
                {trade.notes || ''}
              </TableCell>
              <TableCell>
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
  );
}