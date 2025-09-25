'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import TopBar from '@/components/TopBar';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EmergencyStopButton from '@/components/trading/EmergencyStopButton';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Settings,
  Loader2
} from 'lucide-react';

interface TradingState {
  isActive: boolean;
  hasOpenPosition: boolean;
  currentStrategy: string | null;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  dailyPnL: number;
  lastTradeAt: string | null;
}

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number | null;
  unrealizedPnL: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
}

interface BotStatus {
  tradingState: TradingState | null;
  currentPosition: Position | null;
  isEmergencyActive: boolean;
  connectionHealth: 'good' | 'warning' | 'error';
}

export default function AdminTradingBotPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [botStatus, setBotStatus] = useState<BotStatus>({
    tradingState: null,
    currentPosition: null,
    isEmergencyActive: false,
    connectionHealth: 'good'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load bot status
  const loadBotStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/bot/status');
      if (!response.ok) {
        throw new Error(`Failed to load bot status: ${response.statusText}`);
      }

      const data = await response.json();
      setBotStatus(data);

    } catch (err) {
      console.error('Error loading bot status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bot status');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh bot status every 5 seconds
  useEffect(() => {
    if (isAdmin && !isLoading) {
      loadBotStatus();

      const interval = setInterval(loadBotStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, isLoading]);

  // Toggle bot active state
  const toggleBotActive = async () => {
    try {
      const newState = !botStatus.tradingState?.isActive;
      const response = await fetch('/api/admin/bot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState })
      });

      if (response.ok) {
        await loadBotStatus();
      } else {
        throw new Error('Failed to toggle bot state');
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  // Close current position
  const closePosition = async () => {
    if (!botStatus.currentPosition) return;

    const confirmed = confirm(`Close ${botStatus.currentPosition.side} position for ${botStatus.currentPosition.symbol}?`);
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/bot/position/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual close from admin panel' })
      });

      if (response.ok) {
        await loadBotStatus();
        alert('Position closed successfully');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to close position');
      }
    } catch (err) {
      alert(`Error closing position: ${err}`);
    }
  };

  const calculateWinRate = (winning: number, losing: number) => {
    const total = winning + losing;
    return total > 0 ? ((winning / total) * 100).toFixed(1) : '0.0';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageTriangleLoader />
      </div>
    );
  }

  if (!isAdmin) return null;

  const { tradingState, currentPosition, isEmergencyActive, connectionHealth } = botStatus;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Trading Bot Control" showTimeRangeFilters={false} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header with Emergency Status */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600" />
                Trading Bot Control
                {isEmergencyActive && (
                  <Badge variant="destructive" className="ml-2">
                    EMERGENCY ACTIVE
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Single Position Automated Trading System
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionHealth === 'good' ? 'bg-green-500' :
                connectionHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {connectionHealth === 'good' ? 'Connected' :
                 connectionHealth === 'warning' ? 'Warning' : 'Error'}
              </span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Emergency Stop Section - Always Prominent */}
          <Card className="border-red-200 shadow-lg">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Emergency Stop
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <EmergencyStopButton
                onEmergencyStop={(result) => {
                  console.log('Emergency stop result:', result);
                  setTimeout(loadBotStatus, 2000);
                }}
                disabled={isEmergencyActive}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Bot Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Bot Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center gap-2">
                    {tradingState?.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Play className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Pause className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleBotActive}
                      disabled={isEmergencyActive}
                    >
                      {tradingState?.isActive ? 'Stop' : 'Start'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Position:</span>
                  <Badge variant={tradingState?.hasOpenPosition ? "default" : "secondary"}>
                    {tradingState?.hasOpenPosition ? 'Open' : 'None'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Strategy:</span>
                  <span className="text-sm text-gray-600">
                    {tradingState?.currentStrategy || 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Trade:</span>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(tradingState?.lastTradeAt || null)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Trades:</span>
                  <span className="text-lg font-bold">{tradingState?.totalTrades || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Win Rate:</span>
                  <span className="text-lg font-bold text-green-600">
                    {calculateWinRate(
                      tradingState?.winningTrades || 0,
                      tradingState?.losingTrades || 0
                    )}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total P&L:</span>
                  <span className={`text-lg font-bold ${
                    (tradingState?.totalPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(tradingState?.totalPnL || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily P&L:</span>
                  <span className={`text-lg font-bold ${
                    (tradingState?.dailyPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(tradingState?.dailyPnL || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Current Position */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Current Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPosition ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Symbol:</span>
                      <span className="text-lg font-bold">{currentPosition.symbol}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Side:</span>
                      <Badge variant={currentPosition.side === 'LONG' ? "default" : "secondary"}>
                        {currentPosition.side === 'LONG' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {currentPosition.side}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Quantity:</span>
                      <span className="text-sm">{currentPosition.quantity}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Entry:</span>
                      <span className="text-sm">{formatCurrency(currentPosition.entryPrice)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current:</span>
                      <span className="text-sm">
                        {currentPosition.currentPrice
                          ? formatCurrency(currentPosition.currentPrice)
                          : 'Loading...'
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">P&L:</span>
                      <span className={`text-lg font-bold ${
                        (currentPosition.unrealizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentPosition.unrealizedPnL !== null
                          ? formatCurrency(currentPosition.unrealizedPnL)
                          : 'Calculating...'
                        }
                      </span>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        onClick={closePosition}
                        variant="destructive"
                        className="w-full"
                        disabled={isEmergencyActive}
                      >
                        Close Position
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      {currentPosition.stopLoss && (
                        <div>Stop Loss: {formatCurrency(currentPosition.stopLoss)}</div>
                      )}
                      {currentPosition.takeProfit && (
                        <div>Take Profit: {formatCurrency(currentPosition.takeProfit)}</div>
                      )}
                      <div>Opened: {formatDateTime(currentPosition.openedAt)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No open position</p>
                    <p className="text-xs mt-1">Ready to trade</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manual Trading Control (if no position) */}
          {!currentPosition && tradingState?.isActive && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Manual Trading
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  <p>Manual trading controls will be implemented next</p>
                  <p className="text-xs mt-1">For now, trades are strategy-driven only</p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}