'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import TradeCandlestickChart from '@/components/charts/TradeCandlestickChart';
import ExecutionsTable, { ExecutionOrder } from '@/components/ExecutionsTable';
import { TriangleLoader } from '@/components/ui/TriangleLoader';
import { Trade } from '@/types';

interface SharedTradeMetadata {
  sharedBy: string;
  sharedAt: string;
  description?: string;
}

interface SharedTradeData {
  trade: {
    trades?: Trade[];
    pnl?: number;
    totalTrades?: number;
  };
  orders: ExecutionOrder[];
  metadata: SharedTradeMetadata;
  expiresAt: string;
  createdAt: string;
  apiUsage?: {
    used: number;
    remaining: number;
    total: number;
    percentage: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    lastApiCall?: string;
  };
}

export default function SharedTradePage() {
  const params = useParams();
  const { key } = params;
  
  const [data, setData] = useState<SharedTradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSharedTrade = async () => {
      try {
        const response = await fetch(`/api/share/${key}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load shared trade');
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch shared trade:', error);
        setError(error instanceof Error ? error.message : 'Failed to load shared trade');
      } finally {
        setLoading(false);
      }
    };

    if (key) {
      fetchSharedTrade();
    }
  }, [key]);

  const formatDate = (dateString: string) => {
    // For YYYY-MM-DD format dates, parse without timezone conversion
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    // For other date formats, use existing logic
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeToExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day remaining';
    return `${diffDays} days remaining`;
  };

  const isRecordsShare = (data?.metadata as any)?.isRecordsShare;

  // Extract proper date for records shares
  const getTradeDate = (tradeData: any) => {
    if (isRecordsShare) {
      // For records shares, get date from metadata or extract from trade ID
      const shareDate = (data?.metadata as any)?.shareDate;
      if (shareDate) {
        return new Date(shareDate).toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      // Fallback: extract from trade ID format "records_YYYY-MM-DD"
      const tradeId = tradeData?.id;
      if (typeof tradeId === 'string' && tradeId.startsWith('records_')) {
        return tradeId.replace('records_', '');
      }
    }
    // For single trades, use the trade date
    if (tradeData?.date) {
      return new Date(tradeData.date).toISOString().split('T')[0];
    }
    // Fallback to today's date
    return new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <TriangleLoader size="lg" text="Loading shared trade..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-gray-900">Unable to Load Trade</h1>
              <p className="text-gray-600">{error}</p>
            </div>
            {error.includes('expired') && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Shared trade links expire after 14 days for security purposes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl text-gray-600">Shared trade not found</h1>
        </div>
      </div>
    );
  }

  const { trade, orders } = data;

  const chartDate = getTradeDate(trade);

  // For records shares, show multiple trades, for single trade shares show single trade
  const isMultipleTrades = isRecordsShare && trade.trades && trade.trades.length > 0;
  const tradesToShow = isMultipleTrades ? trade.trades : [trade];

  // Calculate aggregate stats for records shares
  const totalPnl = isMultipleTrades
    ? trade.trades!.reduce((sum: number, t: Trade) => sum + (t.pnl || 0), 0)
    : trade.pnl || 0;

  const totalTrades = isMultipleTrades ? trade.trades?.length || 0 : 1;
  const totalVolume = isMultipleTrades ? (trade as any).quantity : (trade as any).quantity || 0;
  const totalExecutions = isMultipleTrades
    ? trade.trades!.reduce((sum: number, t: Trade) => sum + (t.executions || 0), 0)
    : (trade as any).executions || orders.length;

  // Group orders by symbol for chart display
  const ordersBySymbol = orders.reduce((acc: Record<string, ExecutionOrder[]>, order: ExecutionOrder) => {
    const symbol = order.symbol;
    if (!acc[symbol]) {
      acc[symbol] = [];
    }
    acc[symbol].push(order);
    return acc;
  }, {});

  const mostActiveSymbol = Object.keys(ordersBySymbol).length > 0
    ? Object.entries(ordersBySymbol).reduce((a: [string, ExecutionOrder[]], b: [string, ExecutionOrder[]]) =>
        ordersBySymbol[a[0]].length > ordersBySymbol[b[0]].length ? a : b
      )[0]
    : null;

  const chartExecutions = mostActiveSymbol ? ordersBySymbol[mostActiveSymbol] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {isRecordsShare ? `Trading Record - ${formatDate(chartDate)}` : `Trade: ${(trade as any).symbol}`}
              </h1>
              <p className="text-sm text-gray-500">
                Shared via <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">Trade Voyager Analytics</Link>
              </p>
            </div>
          </div>
          
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <Clock className="h-4 w-4" />
            {getTimeToExpiry(data.expiresAt)}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {totalPnl >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <div className={`text-lg font-semibold ${
                  totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${totalPnl.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-gray-500">P&L</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-900">{totalTrades}</div>
              <div className="text-xs text-gray-500">Trade{totalTrades !== 1 ? 's' : ''}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-900">{totalVolume.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Volume</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-900">{totalExecutions}</div>
              <div className="text-xs text-gray-500">Execution{totalExecutions !== 1 ? 's' : ''}</div>
            </CardContent>
          </Card>
        </div>

        {/* API Usage Warning */}
        {data.apiUsage && (
          <>
            {data.apiUsage.level === 'CRITICAL' && data.apiUsage.remaining <= 10 && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  🚨 <strong>Critical:</strong> Only {data.apiUsage.remaining} chart refreshes remaining before this link expires
                </AlertDescription>
              </Alert>
            )}
            {data.apiUsage.level === 'HIGH' && data.apiUsage.remaining > 10 && data.apiUsage.remaining <= 50 && (
              <Alert className="mb-4 border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  ⚠️ <strong>Warning:</strong> {data.apiUsage.remaining} chart refreshes remaining for this shared link
                </AlertDescription>
              </Alert>
            )}
            {data.apiUsage.level === 'MEDIUM' && data.apiUsage.remaining > 50 && (
              <Alert className="mb-4 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  ℹ️ {data.apiUsage.remaining} chart refreshes remaining ({data.apiUsage.used}/{data.apiUsage.total} used)
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Chart Section */}
        {mostActiveSymbol && chartExecutions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {mostActiveSymbol}
                {data.apiUsage && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({data.apiUsage.used}/{data.apiUsage.total} API calls used)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TradeCandlestickChart
                symbol={mostActiveSymbol}
                executions={chartExecutions.map((order: ExecutionOrder) => ({
                  ...order,
                  userId: 'shared',
                  orderQuantity: order.orderQuantity || 0,
                  limitPrice: order.limitPrice || null,
                  stopPrice: order.stopPrice || null
                }))}
                tradeDate={chartDate}
                height={400}
                onExecutionSelect={() => {}} // No interaction in shared view
                isShared={true}
                shareKey={typeof key === 'string' ? key : undefined}
              />
            </CardContent>
          </Card>
        )}

        {/* Executions Table */}
        <ExecutionsTable 
          executions={orders.map((order: ExecutionOrder) => ({
            ...order,
            id: order.id || `order-${order.orderId}`,
            userId: order.userId || 'shared'
          }))}
          loading={false}
          error={null}
          showActions={false}
          onExecutionSelect={(execution) => {

          }}
        />

        {/* Footer */}
        <div className="text-center py-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Powered by <Link href="/" className="font-medium text-blue-600 hover:text-blue-800 transition-colors">Trade Voyager Analytics</Link>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Shared on {formatDate(data.createdAt)} • Expires {formatDate(data.expiresAt)}
          </div>
        </div>
      </div>
    </div>
  );
}