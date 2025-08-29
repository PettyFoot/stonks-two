import { NextResponse } from 'next/server';
import { ColumnConfiguration } from '@/types';

export async function GET() {
  // Define available columns for the trades table
  const availableColumns: ColumnConfiguration[] = [
    { id: 'date', label: 'Date', visible: true, sortable: true },
    { id: 'time', label: 'Time', visible: true, sortable: true },
    { id: 'symbol', label: 'Symbol', visible: true, sortable: true },
    { id: 'side', label: 'Side', visible: true, sortable: true },
    { id: 'holdingPeriod', label: 'Duration', visible: true, sortable: true },
    { id: 'volume', label: 'Volume', visible: true, sortable: true },
    { id: 'executions', label: 'Executions', visible: true, sortable: true },
    { id: 'pnl', label: 'P&L', visible: true, sortable: true },
    { id: 'entryPrice', label: 'Entry Price', visible: true, sortable: true },
    { id: 'exitPrice', label: 'Exit Price', visible: true, sortable: true },
    { id: 'commission', label: 'Commission', visible: true, sortable: true },
    { id: 'fees', label: 'Fees', visible: true, sortable: true },
    { id: 'notes', label: 'NOTES', visible: true, sortable: false },
    { id: 'tags', label: 'TAGS', visible: true, sortable: false },
    { id: 'marketSession', label: 'Session', visible: true, sortable: true },
    { id: 'orderType', label: 'Order Type', visible: true, sortable: true }
  ];

  return NextResponse.json({
    columns: availableColumns
  });
}