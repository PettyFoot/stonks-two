import { NextResponse } from 'next/server';
import { ColumnConfiguration } from '@/types';

export async function GET() {
  // Define available columns for the trades table
  const availableColumns: ColumnConfiguration[] = [
    { id: 'date', label: 'Date', visible: true, sortable: true },
    { id: 'time', label: 'Time', visible: true, sortable: true },
    { id: 'symbol', label: 'Symbol', visible: true, sortable: true },
    { id: 'side', label: 'Side', visible: false, sortable: true },
    { id: 'volume', label: 'Volume', visible: true, sortable: true },
    { id: 'executions', label: 'Executions', visible: true, sortable: true },
    { id: 'pnl', label: 'P&L', visible: true, sortable: true },
    { id: 'entryPrice', label: 'Entry Price', visible: false, sortable: true },
    { id: 'exitPrice', label: 'Exit Price', visible: false, sortable: true },
    { id: 'commission', label: 'Commission', visible: false, sortable: true },
    { id: 'fees', label: 'Fees', visible: false, sortable: true },
    { id: 'notes', label: 'Notes', visible: true, sortable: false },
    { id: 'tags', label: 'Tags', visible: true, sortable: false },
    { id: 'holdingPeriod', label: 'Duration', visible: false, sortable: true },
    { id: 'marketSession', label: 'Session', visible: false, sortable: true },
    { id: 'orderType', label: 'Order Type', visible: false, sortable: true },
    { id: 'timeInForce', label: 'Time in Force', visible: false, sortable: true }
  ];

  return NextResponse.json({
    columns: availableColumns
  });
}