'use client';

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, MoreHorizontal, ChevronRight, Settings, GripVertical, Copy } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Order } from '@prisma/client';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuCheckboxItem, 
  DropdownMenuSeparator, 
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';

// Extended interface for execution orders with calculated fields
export interface ExecutionOrder extends Omit<Order, 'tags'> {
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

type SortField = 'id' | 'orderId' | 'symbol' | 'orderType' | 'side' | 'timeInForce' | 'orderQuantity' | 'limitPrice' | 'costBasis' | 'stopPrice' | 'orderStatus' | 'orderPlacedTime' | 'orderExecutedTime' | 'orderCancelledTime' | 'orderRoute' | 'brokerType' | 'tradeId';
type SortDirection = 'asc' | 'desc';

// Define priority columns for different screen sizes
const PRIORITY_COLUMNS = {
  mobile: ['symbol', 'side', 'orderQuantity', 'orderStatus'],
  tablet: ['orderExecutedTime', 'symbol', 'side', 'orderQuantity', 'orderStatus', 'limitPrice', 'costBasis'],
  desktop: 'all'
};

// Default column configuration with all requested fields
const DEFAULT_COLUMNS = [
  { id: 'id', label: 'ID', visible: true, sortable: true, minWidth: '120px', width: '120px' },
  { id: 'userId', label: 'User ID', visible: false, sortable: false, minWidth: '120px', width: '120px' }, // Hidden by default
  { id: 'orderId', label: 'Order ID', visible: true, sortable: true, minWidth: '100px', width: '100px' },
  { id: 'symbol', label: 'Symbol', visible: true, sortable: true, minWidth: '80px', width: '80px' },
  { id: 'orderType', label: 'Order Type', visible: true, sortable: true, minWidth: '100px', width: '100px' },
  { id: 'side', label: 'Side', visible: true, sortable: true, minWidth: '80px', width: '80px' },
  { id: 'timeInForce', label: 'Time In Force', visible: true, sortable: true, minWidth: '100px', width: '100px' },
  { id: 'orderQuantity', label: 'Order Quantity', visible: true, sortable: true, minWidth: '120px', width: '120px' },
  { id: 'limitPrice', label: 'Limit Price', visible: true, sortable: true, minWidth: '100px', width: '100px' },
  { id: 'costBasis', label: 'Cost Basis', visible: true, sortable: true, minWidth: '120px', width: '120px' },
  { id: 'stopPrice', label: 'Stop Price', visible: true, sortable: true, minWidth: '100px', width: '100px' },
  { id: 'orderStatus', label: 'Order Status', visible: true, sortable: true, minWidth: '110px', width: '110px' },
  { id: 'orderPlacedTime', label: 'Order Placed Time', visible: true, sortable: true, minWidth: '160px', width: '160px' },
  { id: 'orderExecutedTime', label: 'Order Executed Time', visible: true, sortable: true, minWidth: '160px', width: '160px' },
  { id: 'orderCancelledTime', label: 'Order Cancelled Time', visible: true, sortable: true, minWidth: '160px', width: '160px' },
  { id: 'orderRoute', label: 'Order Route', visible: true, sortable: true, minWidth: '100px', width: '100px' },
  { id: 'brokerType', label: 'Broker Type', visible: true, sortable: true, minWidth: '130px', width: '130px' },
  { id: 'tags', label: 'Tags', visible: true, sortable: false, minWidth: '80px', width: '80px' },
  { id: 'tradeId', label: 'Trade ID', visible: true, sortable: true, minWidth: '120px', width: '120px' }
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
  
  // Column management state
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMNS.map(col => col.id));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.visible }), {})
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: parseInt(col.width.replace('px', '')) }), {})
  );
  
  // Column resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  
  // Flag to track if we're still loading initial preferences
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  
  // Media queries
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');

  // Load preferences from localStorage
  React.useEffect(() => {
    const savedColumnOrder = localStorage.getItem('executions-table-column-order');
    const savedVisibleColumns = localStorage.getItem('executions-table-visible-columns');
    const savedColumnWidths = localStorage.getItem('executions-table-column-widths');
    
    // Helper function to merge new columns into existing saved data
    const mergeNewColumns = (savedOrder: string[], savedVisible: Record<string, boolean>, savedWidths: Record<string, number>) => {
      const defaultOrder = DEFAULT_COLUMNS.map(col => col.id);
      const defaultVisible = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.visible }), {} as Record<string, boolean>);
      const defaultWidths = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: parseInt(col.width.replace('px', '')) }), {} as Record<string, number>);
      
      // Find columns that exist in defaults but not in saved data
      const newColumns = defaultOrder.filter(colId => !savedOrder.includes(colId));
      
      // Merge new columns into the order, maintaining their relative positions from DEFAULT_COLUMNS
      const mergedOrder = [...savedOrder];
      newColumns.forEach(newColId => {
        const defaultIndex = defaultOrder.indexOf(newColId);
        // Find the best insertion position by looking for the next existing column
        let insertIndex = mergedOrder.length; // default to end
        
        for (let i = defaultIndex + 1; i < defaultOrder.length; i++) {
          const nextColId = defaultOrder[i];
          const existingIndex = mergedOrder.indexOf(nextColId);
          if (existingIndex !== -1) {
            insertIndex = existingIndex;
            break;
          }
        }
        
        mergedOrder.splice(insertIndex, 0, newColId);
      });
      
      // Merge visibility and widths for new columns
      const mergedVisible = { ...savedVisible };
      const mergedWidths = { ...savedWidths };
      
      newColumns.forEach(colId => {
        mergedVisible[colId] = defaultVisible[colId];
        mergedWidths[colId] = defaultWidths[colId];
      });
      
      return { order: mergedOrder, visible: mergedVisible, widths: mergedWidths };
    };
    
    if (savedColumnOrder) {
      try {
        const parsedOrder = JSON.parse(savedColumnOrder);
        const parsedVisible = savedVisibleColumns ? JSON.parse(savedVisibleColumns) : {};
        const parsedWidths = savedColumnWidths ? JSON.parse(savedColumnWidths) : {};
        
        const merged = mergeNewColumns(parsedOrder, parsedVisible, parsedWidths);
        
        setColumnOrder(merged.order);
        setVisibleColumns(merged.visible);
        setColumnWidths(merged.widths);
      } catch {
        console.warn('Failed to parse saved column preferences');
      }
    } else {
      // No saved preferences, load defaults
      if (savedVisibleColumns) {
        try {
          const parsedVisible = JSON.parse(savedVisibleColumns);
          const defaultVisible = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.visible }), {} as Record<string, boolean>);
          setVisibleColumns({ ...defaultVisible, ...parsedVisible });
        } catch {
          console.warn('Failed to parse saved visible columns');
        }
      }
      
      if (savedColumnWidths) {
        try {
          const parsedWidths = JSON.parse(savedColumnWidths);
          const defaultWidths = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: parseInt(col.width.replace('px', '')) }), {} as Record<string, number>);
          setColumnWidths({ ...defaultWidths, ...parsedWidths });
        } catch {
          console.warn('Failed to parse saved column widths');
        }
      }
    }
    
    // Mark preferences as loaded
    setIsLoadingPreferences(false);
  }, []);

  // Save preferences to localStorage (but not during initial load)
  React.useEffect(() => {
    if (!isLoadingPreferences) {
      localStorage.setItem('executions-table-column-order', JSON.stringify(columnOrder));
    }
  }, [columnOrder, isLoadingPreferences]);

  React.useEffect(() => {
    if (!isLoadingPreferences) {
      localStorage.setItem('executions-table-visible-columns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, isLoadingPreferences]);

  React.useEffect(() => {
    if (!isLoadingPreferences) {
      localStorage.setItem('executions-table-column-widths', JSON.stringify(columnWidths));
    }
  }, [columnWidths, isLoadingPreferences]);

  // Filter columns based on device type and user preferences
  const getVisibleColumns = () => {
    // Get columns in the user's preferred order
    const orderedColumns = columnOrder
      .map(id => DEFAULT_COLUMNS.find(col => col.id === id))
      .filter((col): col is NonNullable<typeof col> => col !== undefined && Boolean(visibleColumns[col.id]));
    
    if (isMobile) {
      return orderedColumns.filter(col => PRIORITY_COLUMNS.mobile.includes(col.id));
    } else if (isTablet) {
      return orderedColumns.filter(col => PRIORITY_COLUMNS.tablet.includes(col.id));
    }
    
    return orderedColumns;
  };
  
  const visibleColumnsData = getVisibleColumns();

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
        case 'id':
          aValue = a.id || '';
          bValue = b.id || '';
          break;
        case 'orderId':
          aValue = a.orderId || '';
          bValue = b.orderId || '';
          break;
        case 'symbol':
          aValue = a.symbol || '';
          bValue = b.symbol || '';
          break;
        case 'orderType':
          aValue = a.orderType || '';
          bValue = b.orderType || '';
          break;
        case 'side':
          aValue = a.side || '';
          bValue = b.side || '';
          break;
        case 'timeInForce':
          aValue = a.timeInForce || '';
          bValue = b.timeInForce || '';
          break;
        case 'orderQuantity':
          aValue = a.orderQuantity || 0;
          bValue = b.orderQuantity || 0;
          break;
        case 'limitPrice':
          aValue = Number(a.limitPrice) || 0;
          bValue = Number(b.limitPrice) || 0;
          break;
        case 'costBasis':
          aValue = (a.orderQuantity || 0) * (Number(a.limitPrice) || 0);
          bValue = (b.orderQuantity || 0) * (Number(b.limitPrice) || 0);
          break;
        case 'stopPrice':
          aValue = Number(a.stopPrice) || 0;
          bValue = Number(b.stopPrice) || 0;
          break;
        case 'orderStatus':
          aValue = a.orderStatus || '';
          bValue = b.orderStatus || '';
          break;
        case 'orderPlacedTime':
          aValue = a.orderPlacedTime ? new Date(a.orderPlacedTime).getTime() : 0;
          bValue = b.orderPlacedTime ? new Date(b.orderPlacedTime).getTime() : 0;
          break;
        case 'orderExecutedTime':
          aValue = a.orderExecutedTime ? new Date(a.orderExecutedTime).getTime() : 0;
          bValue = b.orderExecutedTime ? new Date(b.orderExecutedTime).getTime() : 0;
          break;
        case 'orderCancelledTime':
          aValue = a.orderCancelledTime ? new Date(a.orderCancelledTime).getTime() : 0;
          bValue = b.orderCancelledTime ? new Date(b.orderCancelledTime).getTime() : 0;
          break;
        case 'orderRoute':
          aValue = a.orderRoute || '';
          bValue = b.orderRoute || '';
          break;
        case 'brokerType':
          aValue = a.brokerType || '';
          bValue = b.brokerType || '';
          break;
        case 'tradeId':
          aValue = a.tradeId || '';
          bValue = b.tradeId || '';
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

  const formatPrice = (price: number | string | null | undefined | { toString(): string }) => {
    if (!price || price === 0) return '-';
    const numPrice = typeof price === 'string' ? parseFloat(price) : 
                     typeof price === 'number' ? price : 
                     parseFloat(price.toString());
    return `$${numPrice.toFixed(2)}`;
  };

  const formatEnumValue = (value: string | undefined) => {
    if (!value) return '-';
    // Convert enum values like "CHARLES_SCHWAB" to "Charles Schwab"
    return value.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };


  // Column management functions
  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const selectAllColumns = () => {
    const allVisible = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {});
    setVisibleColumns(allVisible);
  };

  const deselectAllColumns = () => {
    // Keep only the symbol column visible (minimum requirement)
    const onlySymbol = DEFAULT_COLUMNS.reduce((acc, col) => ({ 
      ...acc, 
      [col.id]: col.id === 'symbol' 
    }), {});
    setVisibleColumns(onlySymbol);
  };

  const resetColumnsToDefault = () => {
    const defaultOrder = DEFAULT_COLUMNS.map(col => col.id);
    const defaultVisible = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.visible }), {} as Record<string, boolean>);
    const defaultWidths = DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: parseInt(col.width.replace('px', '')) }), {} as Record<string, number>);
    setColumnOrder(defaultOrder);
    setVisibleColumns(defaultVisible);
    setColumnWidths(defaultWidths);
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setColumnOrder(newOrder);
  };

  // Copy function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  // Column resizing functions
  const startResize = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingColumn(columnId);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnId]);
  };

  const handleResize = React.useCallback((e: MouseEvent) => {
    if (!isResizing || !resizingColumn) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(60, startWidth + diff); // Minimum width of 60px
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  }, [isResizing, resizingColumn, startX, startWidth]);

  const stopResize = React.useCallback(() => {
    setIsResizing(false);
    setResizingColumn(null);
    setStartX(0);
    setStartWidth(0);
  }, []);

  // Add mouse event listeners for resizing
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResize, stopResize]);

  // Function to render cell content based on column ID
  const renderCellContent = (execution: ExecutionOrder, columnId: string) => {
    const cellStyle = {
      width: `${columnWidths[columnId]}px`,
      minWidth: '60px',
      maxWidth: '500px'
    };
    
    const cellClassName = "border-r border-theme-border/30";
    switch (columnId) {
      case 'id':
        return (
          <TableCell 
            className={cn("text-sm text-theme-primary-text font-mono", cellClassName)} 
            style={cellStyle}
            title={execution.id} // Tooltip shows full value
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              {execution.id}
            </div>
          </TableCell>
        );
      case 'userId':
        return (
          <TableCell 
            className={cn("text-sm text-theme-secondary-text font-mono", cellClassName)} 
            style={cellStyle}
            title={execution.userId} // Tooltip shows full value
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              {execution.userId}
            </div>
          </TableCell>
        );
      case 'orderId':
        return (
          <TableCell 
            className={cn("text-sm text-theme-primary-text font-medium", cellClassName)} 
            style={cellStyle}
            title={execution.orderId || ''} // Tooltip shows full value
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              {execution.orderId || '-'}
            </div>
          </TableCell>
        );
      case 'symbol':
        return (
          <TableCell className={cn("text-sm font-medium text-theme-primary-text", cellClassName)} style={cellStyle}>
            {execution.symbol}
          </TableCell>
        );
      case 'orderType':
        return (
          <TableCell className={cn("text-sm text-theme-primary-text", cellClassName)} style={cellStyle}>
            {formatEnumValue(execution.orderType)}
          </TableCell>
        );
      case 'side':
        return (
          <TableCell className={cn(
            'text-sm font-medium',
            execution.side === 'BUY' ? 'text-theme-green' : 'text-theme-red',
            cellClassName
          )} style={cellStyle}>
            {execution.side || '-'}
          </TableCell>
        );
      case 'timeInForce':
        return (
          <TableCell className={cn("text-sm text-theme-primary-text", cellClassName)} style={cellStyle}>
            {execution.timeInForce || '-'}
          </TableCell>
        );
      case 'orderQuantity':
        return (
          <TableCell className={cn("text-sm text-theme-primary-text", cellClassName)} style={cellStyle}>
            {execution.orderQuantity.toLocaleString()}
          </TableCell>
        );
      case 'limitPrice':
        return (
          <TableCell className={cn("text-sm text-theme-primary-text whitespace-nowrap", cellClassName)} style={cellStyle}>
            {formatPrice(execution.limitPrice)}
          </TableCell>
        );
      case 'costBasis':
        const costBasis = (execution.orderQuantity || 0) * (Number(execution.limitPrice) || 0);
        return (
          <TableCell className={cn("text-sm text-theme-primary-text whitespace-nowrap font-medium", cellClassName)} style={cellStyle}>
            {costBasis > 0 ? formatPrice(costBasis) : '-'}
          </TableCell>
        );
      case 'stopPrice':
        return (
          <TableCell className={cn("text-sm text-theme-primary-text whitespace-nowrap", cellClassName)} style={cellStyle}>
            {formatPrice(execution.stopPrice)}
          </TableCell>
        );
      case 'orderStatus':
        return (
          <TableCell className={cn(
            'text-sm font-medium',
            execution.orderStatus === 'FILLED' ? 'text-theme-green' : 
            execution.orderStatus === 'CANCELLED' ? 'text-theme-red' : 
            'text-theme-primary-text',
            cellClassName
          )} style={cellStyle}>
            {formatEnumValue(execution.orderStatus)}
          </TableCell>
        );
      case 'orderPlacedTime':
        return (
          <TableCell className={cn("text-sm text-theme-primary-text font-medium whitespace-nowrap", cellClassName)} style={cellStyle}>
            {formatTime(execution.orderPlacedTime)}
          </TableCell>
        );
      case 'orderExecutedTime':
        return (
          <TableCell className={cn("text-sm text-theme-primary-text font-medium whitespace-nowrap", cellClassName)} style={cellStyle}>
            {formatTime(execution.orderExecutedTime)}
          </TableCell>
        );
      case 'orderCancelledTime':
        return (
          <TableCell className={cn("text-sm text-theme-secondary-text whitespace-nowrap", cellClassName)} style={cellStyle}>
            {formatTime(execution.orderCancelledTime)}
          </TableCell>
        );
      case 'orderRoute':
        return (
          <TableCell 
            className={cn("text-sm text-theme-primary-text", cellClassName)} 
            style={cellStyle}
            title={execution.orderRoute || ''} // Tooltip shows full value
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              {execution.orderRoute || '-'}
            </div>
          </TableCell>
        );
      case 'brokerType':
        return (
          <TableCell 
            className={cn("text-sm text-theme-primary-text", cellClassName)} 
            style={cellStyle}
            title={execution.brokerType || ''} // Tooltip shows full value
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              {formatEnumValue(execution.brokerType)}
            </div>
          </TableCell>
        );
      case 'tags':
        return (
          <TableCell className={cellClassName} style={cellStyle}>
            <div className="flex gap-1 flex-wrap">
              {execution.tags?.slice(0, 2).map((tag) => (
                <span 
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-theme-surface100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
              {(execution.tags?.length || 0) > 2 && (
                <span className="text-xs text-theme-secondary-text">
                  +{(execution.tags?.length || 0) - 2} more
                </span>
              )}
            </div>
          </TableCell>
        );
      case 'tradeId':
        return (
          <TableCell 
            className={cn("text-sm text-theme-secondary-text font-mono", cellClassName)} 
            style={cellStyle}
            title={execution.tradeId || ''} // Tooltip shows full value
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              {execution.tradeId || '-'}
            </div>
          </TableCell>
        );
      default:
        return (
          <TableCell className={cn("text-sm text-theme-secondary-text", cellClassName)} style={cellStyle}>
            -
          </TableCell>
        );
    }
  };
  
  // Render expanded row details for mobile - show ALL columns with better organization
  const renderExpandedDetails = (execution: ExecutionOrder) => {
    // On mobile, show ALL columns that aren't already visible in the main row
    const allColumns = DEFAULT_COLUMNS.filter(col => 
      !visibleColumnsData.find(vc => vc?.id === col.id)
    );
    
    return (
      <TableRow className="bg-theme-surface25">
        <TableCell colSpan={visibleColumnsData.length + (isMobile ? 1 : 0) + (showActions ? 1 : 0)}>
          <div className="px-3 py-4 space-y-4">
            {/* Order Information Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-theme-primary-text uppercase tracking-wide border-b border-theme-border pb-1">
                Order Information
              </h4>
              <div className="space-y-2 text-sm">
                {execution.orderId && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium min-w-0 flex-shrink-0">Order ID:</span>
                    <span className="font-mono text-theme-primary-text text-right break-all ml-2">{execution.orderId}</span>
                  </div>
                )}
                {execution.orderType && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Order Type:</span>
                    <span className="text-theme-primary-text ml-2">{formatEnumValue(execution.orderType)}</span>
                  </div>
                )}
                {execution.timeInForce && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Time In Force:</span>
                    <span className="text-theme-primary-text ml-2">{execution.timeInForce}</span>
                  </div>
                )}
                {execution.orderRoute && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Route:</span>
                    <span className="text-theme-primary-text ml-2">{execution.orderRoute}</span>
                  </div>
                )}
                {execution.brokerType && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Broker:</span>
                    <span className="text-theme-primary-text ml-2">{formatEnumValue(execution.brokerType)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-theme-primary-text uppercase tracking-wide border-b border-theme-border pb-1">
                Pricing Details
              </h4>
              <div className="space-y-2 text-sm">
                {execution.limitPrice && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Limit Price:</span>
                    <span className="text-theme-primary-text font-medium ml-2">{formatPrice(execution.limitPrice)}</span>
                  </div>
                )}
                {execution.stopPrice && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Stop Price:</span>
                    <span className="text-theme-primary-text font-medium ml-2">{formatPrice(execution.stopPrice)}</span>
                  </div>
                )}
                {execution.orderQuantity && execution.limitPrice && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Cost Basis:</span>
                    <span className="text-theme-primary-text font-semibold ml-2">
                      {formatPrice((execution.orderQuantity || 0) * (Number(execution.limitPrice) || 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timing Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-theme-primary-text uppercase tracking-wide border-b border-theme-border pb-1">
                Order Timeline
              </h4>
              <div className="space-y-2 text-sm">
                {execution.orderPlacedTime && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Placed:</span>
                    <span className="text-theme-primary-text font-mono ml-2">{formatTime(execution.orderPlacedTime)}</span>
                  </div>
                )}
                {execution.orderExecutedTime && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Executed:</span>
                    <span className="text-theme-primary-text font-mono ml-2">{formatTime(execution.orderExecutedTime)}</span>
                  </div>
                )}
                {execution.orderCancelledTime && (
                  <div className="flex justify-between items-start">
                    <span className="text-theme-secondary-text font-medium">Cancelled:</span>
                    <span className="text-theme-primary-text font-mono ml-2">{formatTime(execution.orderCancelledTime)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details Section */}
            {(execution.id || execution.tradeId || execution.tags?.length) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-theme-primary-text uppercase tracking-wide border-b border-theme-border pb-1">
                  Additional Details
                </h4>
                <div className="space-y-2 text-sm">
                  {execution.id && (
                    <div className="flex justify-between items-start">
                      <span className="text-theme-secondary-text font-medium min-w-0 flex-shrink-0">Execution ID:</span>
                      <span className="font-mono text-theme-primary-text text-right break-all ml-2 text-xs">{execution.id}</span>
                    </div>
                  )}
                  {execution.tradeId && (
                    <div className="flex justify-between items-start">
                      <span className="text-theme-secondary-text font-medium min-w-0 flex-shrink-0">Trade ID:</span>
                      <span className="font-mono text-theme-primary-text text-right break-all ml-2 text-xs">{execution.tradeId}</span>
                    </div>
                  )}
                  {execution.tags?.length && (
                    <div className="flex justify-between items-start">
                      <span className="text-theme-secondary-text font-medium">Tags:</span>
                      <div className="ml-2 flex flex-wrap gap-1 justify-end">
                        {execution.tags.map((tag) => (
                          <span 
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-theme-surface100 text-theme-primary-text border border-theme-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left font-medium text-theme-primary-text hover:text-theme-primary-text/80"
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
      pnl: acc.pnl + (execution.pnl || 0),
      costBasis: acc.costBasis + ((execution.orderQuantity || 0) * (Number(execution.limitPrice) || 0))
    }), { executions: 0, volume: 0, pnl: 0, costBasis: 0 });
  }, [executions]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme-border rounded-lg">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-theme-border">
                {isMobile && <TableHead className="w-10"></TableHead>}
                {visibleColumnsData.map((column) => column && (
                  <TableHead key={column.id} className="text-xs font-medium text-theme-secondary-text uppercase">
                    {column.label}
                  </TableHead>
                )).filter(Boolean)}
                {showActions && !isMobile && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {isMobile && <TableCell className="w-10"></TableCell>}
                  {visibleColumnsData.map((column) => column && (
                    <TableCell key={column.id}>
                      <div className="h-4 bg-theme-surface200 rounded animate-pulse"></div>
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
      <div className="bg-theme-surface border border-theme-border rounded-lg p-8 text-center">
        <p className="text-theme-red font-medium">Error loading executions</p>
        <p className="text-theme-secondary-text text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Empty state
  if (executions.length === 0) {
    return (
      <div className="bg-theme-surface border border-theme-border rounded-lg p-8 text-center">
        <p className="text-theme-secondary-text font-medium">No executions found</p>
        <p className="text-theme-secondary-text text-sm mt-1">There are no order executions for this trade yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-theme-surface border border-theme-border rounded-lg">
      {/* Column Management Header */}
      <div className="flex items-center justify-between p-3 border-b border-theme-border">
        <h3 className="text-sm font-medium text-theme-primary-text">
          Orders ({executions.length} executions)
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 shadow-lg">
            <DropdownMenuLabel>Manage Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Quick Actions */}
            <div className="flex gap-2 px-2 py-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-xs"
                onClick={selectAllColumns}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-xs"
                onClick={deselectAllColumns}
              >
                Deselect All
              </Button>
            </div>
            <DropdownMenuSeparator />
            
            {/* Column Visibility Controls */}
            <div className="max-h-60 overflow-y-auto">
              {DEFAULT_COLUMNS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns[column.id]}
                  onCheckedChange={() => toggleColumnVisibility(column.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{column.label}</span>
                    <GripVertical className="h-3 w-3 text-theme-secondary-text ml-2" />
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </div>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetColumnsToDefault}>
              Reset to Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-theme-border scrollbar-track-transparent">
        <Table className="w-full min-w-max">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-theme-border">
              {isMobile && (
                <TableHead className="w-10"></TableHead>
              )}
              {visibleColumnsData.map((column) => column && (
                <TableHead 
                  key={column.id} 
                  className="text-xs font-medium text-theme-secondary-text uppercase relative border-r border-theme-border/50"
                  style={{ 
                    width: `${columnWidths[column.id]}px`,
                    minWidth: '60px',
                    maxWidth: '500px'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {column.sortable ? (
                        <SortButton field={column.id as SortField}>{column.label}</SortButton>
                      ) : (
                        column.label
                      )}
                    </div>
                    
                    {/* Resize Handle */}
                    <div
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-all z-10",
                        resizingColumn === column.id 
                          ? "bg-blue-500 opacity-100 w-2" 
                          : "hover:bg-blue-500 opacity-0 hover:opacity-100"
                      )}
                      onMouseDown={(e) => startResize(column.id, e)}
                      title="Drag to resize column"
                    />
                  </div>
                </TableHead>
              ))}
              {showActions && !isMobile && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedExecutions.map((execution) => (
              <React.Fragment key={execution.id}>
                <TableRow 
                  className={cn(
                    "border-b border-theme-border cursor-pointer transition-colors",
                    isMobile 
                      ? "hover:bg-theme-surface50 active:bg-theme-surface100" 
                      : "hover:bg-theme-surface50"
                  )}
                  onClick={() => {
                    if (isMobile) {
                      toggleRowExpansion(execution.id);
                    } else {
                      onExecutionSelect?.(execution);
                    }
                  }}
                >
                  {isMobile && (
                    <TableCell className="w-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpansion(execution.id);
                        }}
                        className="p-2 -m-1 rounded-md hover:bg-theme-surface100 active:bg-theme-surface200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        aria-label={expandedRows.includes(execution.id) ? "Collapse details" : "Expand details"}
                      >
                        <ChevronRight 
                          className={cn(
                            "h-5 w-5 text-theme-secondary-text transition-all duration-200 ease-in-out",
                            expandedRows.includes(execution.id) && "rotate-90 text-theme-primary-text"
                          )}
                        />
                      </button>
                    </TableCell>
                  )}
                  {visibleColumnsData.map((column) => {
                    if (!column) return null;
                    const cellContent = renderCellContent(execution, column.id);
                    return <React.Fragment key={column.id}>{cellContent}</React.Fragment>;
                  }).filter(Boolean)}
                  {showActions && !isMobile && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Order Details</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Show full values for truncated fields */}
                          <div className="px-2 py-1 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-theme-secondary-text">ID:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-theme-primary-text">{execution.id}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-4 w-4 p-0"
                                  onClick={() => copyToClipboard(execution.id)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-theme-secondary-text">Order ID:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-theme-primary-text">{execution.orderId}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-4 w-4 p-0"
                                  onClick={() => copyToClipboard(execution.orderId)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {execution.tradeId && (
                              <div className="flex justify-between">
                                <span className="text-theme-secondary-text">Trade ID:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-theme-primary-text">{execution.tradeId}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-4 w-4 p-0"
                                    onClick={() => copyToClipboard(execution.tradeId || '')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between">
                              <span className="text-theme-secondary-text">Status:</span>
                              <span className={cn(
                                'text-xs',
                                execution.orderStatus === 'FILLED' ? 'text-theme-green' : 
                                execution.orderStatus === 'CANCELLED' ? 'text-theme-red' : 
                                'text-theme-primary-text'
                              )}>
                                {formatEnumValue(execution.orderStatus)}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
                {isMobile && expandedRows.includes(execution.id) && renderExpandedDetails(execution)}
              </React.Fragment>
            ))}
            
            {/* Totals Row - Hidden on mobile */}
            {!isMobile && (
              <TableRow className="bg-theme-surface50 border-t-2 border-theme-border font-medium hover:bg-theme-surface50">
                {visibleColumnsData.map((column, index) => {
                  if (!column) return null;
                  
                  // For the first column, show "TOTAL:"
                  if (index === 0) {
                    return (
                      <TableCell key={column.id} className="text-sm font-semibold text-theme-primary-text">
                        TOTAL:
                      </TableCell>
                    );
                  }
                  
                  // For other columns, show the appropriate total or empty cell
                  switch (column.id) {
                    case 'symbol':
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-theme-primary-text">
                          {totals.executions} order{totals.executions !== 1 ? 's' : ''}
                        </TableCell>
                      );
                    case 'orderQuantity':
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-theme-primary-text">
                          {totals.volume.toLocaleString()}
                        </TableCell>
                      );
                    case 'costBasis':
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-theme-primary-text">
                          {totals.costBasis > 0 ? formatPrice(totals.costBasis) : '-'}
                        </TableCell>
                      );
                    case 'orderStatus':
                      const filledCount = executions.filter(e => e.orderStatus === 'FILLED').length;
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-theme-green">
                          {filledCount} Filled
                        </TableCell>
                      );
                    case 'side':
                      const buyCount = executions.filter(e => e.side === 'BUY').length;
                      const sellCount = executions.filter(e => e.side === 'SELL').length;
                      return (
                        <TableCell key={column.id} className="text-sm font-semibold text-theme-primary-text">
                          {buyCount}B / {sellCount}S
                        </TableCell>
                      );
                    default:
                      return <TableCell key={column.id}></TableCell>;
                  }
                }).filter(Boolean)}
                {showActions && <TableCell></TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Mobile Totals Summary */}
      {isMobile && (
        <div className="p-4 border-t border-theme-border bg-theme-surface50">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-theme-secondary-text">Total Executions:</span>
              <span className="ml-2 font-semibold">{totals.executions}</span>
            </div>
            <div>
              <span className="text-theme-secondary-text">Total Volume:</span>
              <span className="ml-2 font-semibold">{totals.volume.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-theme-secondary-text">Total P&L:</span>
              <span className={cn(
                'ml-2 font-semibold',
                totals.pnl >= 0 ? 'text-theme-green' : 'text-theme-red'
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