'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import TopBar from '@/components/TopBar';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Settings,
  Users,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Calculator,
} from 'lucide-react';

interface SyncConfig {
  id: string;
  startDate: string;
  endDate: string | null;
  limit: number;
  activityTypes: string;
}

interface SnapTradeUser {
  id: string;
  email: string;
  hasSnapTradeConnection: boolean;
  snapTradeUserId: string;
  autoSyncEnabled: boolean;
  lastSync: {
    status: string;
    startedAt: string;
    activitiesFound: number;
    ordersCreated: number;
    dataReturned: boolean;
    hasErrors: boolean;
  } | null;
}

interface SyncLog {
  id: string;
  userEmail: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  activitiesFound: number;
  ordersCreated: number;
  dataReturned: boolean;
  orderIds: string[] | null;
  errors: string[] | null;
  duration: number | null;
}

interface AllUser {
  id: string;
  email: string;
  createdAt: string;
  hasSnapTradeConnection: boolean;
  snapTradeUserId: string | null;
  autoSyncEnabled: boolean;
  statistics: {
    totalOrders: number;
    totalTrades: number;
    unprocessedOrders: number;
    openTrades: number;
    completedTrades: number;
    totalPnL: number;
    lastTradeCalculation: string | null;
  };
}

interface TradeCalculationResult {
  userId: string;
  email: string;
  success: boolean;
  tradesCreated: number;
  completedTrades: number;
  openTrades: number;
  totalPnL: number;
  ordersProcessed: number;
  errors: string[];
}

export default function SnapTradeAdminPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [users, setUsers] = useState<SnapTradeUser[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedForCalc, setSelectedForCalc] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [configChanged, setConfigChanged] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadConfig(),
        loadUsers(),
        loadAllUsers(),
        loadLogs()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (isAdmin && !isLoading) {
      loadData();
    }
  }, [isAdmin, isLoading, loadData]);

  const loadConfig = async () => {
    const response = await fetch('/api/admin/snaptrade/config');
    if (response.ok) {
      const data = await response.json();
      setConfig(data.config);
    }
  };

  const loadUsers = async () => {
    const response = await fetch('/api/admin/snaptrade/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users);
    }
  };

  const loadAllUsers = async () => {
    const response = await fetch('/api/admin/users/all');
    if (response.ok) {
      const data = await response.json();
      setAllUsers(data.users);
    }
  };

  const loadLogs = async () => {
    const response = await fetch('/api/admin/snaptrade/logs?limit=10');
    if (response.ok) {
      const data = await response.json();
      setLogs(data.logs);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      const response = await fetch('/api/admin/snaptrade/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setConfigChanged(false);
        alert('Configuration saved successfully!');
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    }
  };

  const triggerSync = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user to sync');
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/admin/snaptrade/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers)
        })
      });

      const data = await response.json();

      // Log full response for debugging
      console.log('[ADMIN_SYNC] Full sync response:', data);

      if (response.ok) {
        // Check if there were any failures and show detailed errors
        if (data.failed > 0 && data.results) {
          const failedUsers = data.results.filter((r: any) => !r.success);
          const errorDetails = failedUsers.map((user: any) =>
            `${user.email}: ${user.errors?.join(', ') || 'Unknown error'}`
          ).join('\n');

          alert(`Sync completed with errors!\n\nSUCCESS: ${data.successful}/${data.processed} users synced successfully\nTRADES: ${data.totalTradesImported} total trades imported\n\nFAILED USERS:\n${errorDetails}`);
        } else {
          alert(`Sync completed! ${data.successful}/${data.processed} users synced successfully. ${data.totalTradesImported} total trades imported.`);
        }
        setSelectedUsers(new Set());
        await Promise.all([loadUsers(), loadAllUsers(), loadLogs()]);
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Error triggering sync');
    } finally {
      setSyncing(false);
    }
  };

  const syncAllUsers = async () => {
    try {
      setSyncing(true);
      const allUserIds = users.map(user => user.id);
      const response = await fetch('/api/admin/snaptrade/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: allUserIds
        })
      });

      const data = await response.json();

      // Log full response for debugging
      console.log('[ADMIN_SYNC_ALL] Full sync response:', data);

      if (response.ok) {
        // Check if there were any failures and show detailed errors
        if (data.failed > 0 && data.results) {
          const failedUsers = data.results.filter((r: any) => !r.success);
          const errorDetails = failedUsers.map((user: any) =>
            `${user.email}: ${user.errors?.join(', ') || 'Unknown error'}`
          ).join('\n');

          alert(`Sync All completed with errors!\n\nSUCCESS: ${data.successful}/${data.processed} users synced successfully\nTRADES: ${data.totalTradesImported} total trades imported\n\nFAILED USERS:\n${errorDetails}`);
        } else {
          alert(`Sync All completed! ${data.successful}/${data.processed} users synced successfully. ${data.totalTradesImported} total trades imported.`);
        }
        await Promise.all([loadUsers(), loadAllUsers(), loadLogs()]);
      } else {
        alert(`Sync All failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error syncing all users:', error);
      alert('Error syncing all users');
    } finally {
      setSyncing(false);
    }
  };

  const toggleAutoSync = async (userId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/users/auto-sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, autoSyncEnabled: enabled })
      });

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(user =>
          user.id === userId ? { ...user, autoSyncEnabled: enabled } : user
        ));
      } else {
        const error = await response.json();
        alert(`Failed to update auto-sync: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling auto-sync:', error);
      alert('Error updating auto-sync setting');
    }
  };

  const testConnection = async (userId: string, email: string) => {
    try {
      const response = await fetch('/api/snaptrade/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      console.log('[ADMIN_TEST] Test connection response:', data);

      if (response.ok && data.success) {
        alert(`✅ Connection Test SUCCESS for ${email}!\n\nAccounts found: ${data.accounts.length}\nMessage: ${data.message}`);
      } else {
        const errorDetails = data.details ? JSON.stringify(data.details, null, 2) : data.error;
        alert(`❌ Connection Test FAILED for ${email}!\n\nError: ${errorDetails}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert(`❌ Test failed for ${email}: ${error}`);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleCalcSelection = (userId: string) => {
    const newSelection = new Set(selectedForCalc);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedForCalc(newSelection);
  };

  const calculateTrades = async () => {
    if (selectedForCalc.size === 0) {
      alert('Please select at least one user to calculate trades');
      return;
    }

    try {
      setCalculating(true);
      const response = await fetch('/api/admin/trades/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedForCalc)
        })
      });

      const data = await response.json();

      console.log('[ADMIN_CALC] Full calculation response:', data);

      if (response.ok) {
        // Check if there were any failures and show detailed results
        if (data.failed > 0 && data.results) {
          const failedUsers = data.results.filter((r: TradeCalculationResult) => !r.success);
          const errorDetails = failedUsers.map((user: TradeCalculationResult) =>
            `${user.email}: ${user.errors?.join(', ') || 'Unknown error'}`
          ).join('\n');

          alert(`Trade Calculation completed with errors!\n\nSUCCESS: ${data.successful}/${data.processed} users processed\nTRADES CREATED: ${data.summary.totalTradesCreated}\nTOTAL P&L: $${data.summary.totalPnL.toFixed(2)}\nORDERS PROCESSED: ${data.summary.totalOrdersProcessed}\n\nFAILED USERS:\n${errorDetails}`);
        } else {
          alert(`Trade Calculation completed!\n\n${data.successful}/${data.processed} users processed successfully\nTRADES CREATED: ${data.summary.totalTradesCreated}\nCOMPLETED TRADES: ${data.summary.totalCompletedTrades}\nOPEN TRADES: ${data.summary.totalOpenTrades}\nTOTAL P&L: $${data.summary.totalPnL.toFixed(2)}\nORDERS PROCESSED: ${data.summary.totalOrdersProcessed}`);
        }
        setSelectedForCalc(new Set());
        await loadAllUsers(); // Refresh user statistics
      } else {
        alert(`Trade calculation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error calculating trades:', error);
      alert('Error calculating trades');
    } finally {
      setCalculating(false);
    }
  };

  const calculateAllTrades = async () => {
    try {
      setCalculating(true);
      const allUserIds = allUsers.map(user => user.id);
      const response = await fetch('/api/admin/trades/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: allUserIds
        })
      });

      const data = await response.json();

      console.log('[ADMIN_CALC_ALL] Full calculation response:', data);

      if (response.ok) {
        // Check if there were any failures and show detailed results
        if (data.failed > 0 && data.results) {
          const failedUsers = data.results.filter((r: TradeCalculationResult) => !r.success);
          const errorDetails = failedUsers.map((user: TradeCalculationResult) =>
            `${user.email}: ${user.errors?.join(', ') || 'Unknown error'}`
          ).join('\n');

          alert(`Calculate All completed with errors!\n\nSUCCESS: ${data.successful}/${data.processed} users processed\nTRADES CREATED: ${data.summary.totalTradesCreated}\nTOTAL P&L: $${data.summary.totalPnL.toFixed(2)}\nORDERS PROCESSED: ${data.summary.totalOrdersProcessed}\n\nFAILED USERS:\n${errorDetails}`);
        } else {
          alert(`Calculate All completed!\n\n${data.successful}/${data.processed} users processed successfully\nTRADES CREATED: ${data.summary.totalTradesCreated}\nCOMPLETED TRADES: ${data.summary.totalCompletedTrades}\nOPEN TRADES: ${data.summary.totalOpenTrades}\nTOTAL P&L: $${data.summary.totalPnL.toFixed(2)}\nORDERS PROCESSED: ${data.summary.totalOrdersProcessed}`);
        }
        await loadAllUsers(); // Refresh user statistics
      } else {
        alert(`Calculate All failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error calculating all trades:', error);
      alert('Error calculating all trades');
    } finally {
      setCalculating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Running</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageTriangleLoader />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="SnapTrade Management" showTimeRangeFilters={false} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-6 w-6 text-blue-600" />
                SnapTrade Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure sync settings and manage user connections
              </p>
            </div>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Sync Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={config.startDate}
                      onChange={(e) => {
                        setConfig({ ...config, startDate: e.target.value });
                        setConfigChanged(true);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date (optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={config.endDate || ''}
                      onChange={(e) => {
                        setConfig({ ...config, endDate: e.target.value || null });
                        setConfigChanged(true);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="limit">Activity Limit</Label>
                    <Input
                      id="limit"
                      type="number"
                      min="1"
                      max="5000"
                      value={config.limit}
                      onChange={(e) => {
                        setConfig({ ...config, limit: parseInt(e.target.value) });
                        setConfigChanged(true);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="activityTypes">Activity Types</Label>
                    <Input
                      id="activityTypes"
                      value={config.activityTypes}
                      onChange={(e) => {
                        setConfig({ ...config, activityTypes: e.target.value });
                        setConfigChanged(true);
                      }}
                      placeholder="BUY,SELL"
                    />
                  </div>
                </div>
              )}
              {configChanged && (
                <Button onClick={saveConfig} className="mt-4">
                  Save Configuration
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Users with SnapTrade Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users with SnapTrade Connections ({users.length})
                <div className="ml-auto flex gap-2">
                  <Button
                    onClick={() => syncAllUsers()}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                  >
                    {syncing ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync All
                  </Button>
                  {selectedUsers.size > 0 && (
                    <Button
                      onClick={triggerSync}
                      disabled={syncing}
                      size="sm"
                    >
                      {syncing ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Sync Selected ({selectedUsers.size})
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-gray-500">
                        SnapTrade ID: {user.snapTradeUserId}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox
                          checked={user.autoSyncEnabled}
                          onCheckedChange={(checked) => toggleAutoSync(user.id, !!checked)}
                        />
                        <span className="text-xs text-gray-600">Auto-sync enabled</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        {user.lastSync ? (
                          <div className="space-y-1">
                            {getStatusBadge(user.lastSync.status)}
                            <div className="text-xs text-gray-500">
                              {user.lastSync.activitiesFound} activities, {user.lastSync.ordersCreated} orders
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(user.lastSync.startedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="secondary">Never synced</Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => testConnection(user.id, user.email)}
                        variant="outline"
                        size="sm"
                        className="ml-2"
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trade Calculation for All Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Trade Calculation - All Users ({allUsers.length})
                <div className="ml-auto flex gap-2">
                  <Button
                    onClick={calculateAllTrades}
                    disabled={calculating}
                    variant="outline"
                    size="sm"
                  >
                    {calculating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Calculator className="w-4 h-4 mr-2" />
                    )}
                    Calculate All
                  </Button>
                  {selectedForCalc.size > 0 && (
                    <Button
                      onClick={calculateTrades}
                      disabled={calculating}
                      size="sm"
                    >
                      {calculating ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Calculate Selected ({selectedForCalc.size})
                    </Button>
                  )}
                </div>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Process orders into trades for users. This will analyze unprocessed orders and create complete or incomplete trades.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedForCalc.has(user.id)}
                      onCheckedChange={() => toggleCalcSelection(user.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-gray-500">
                        {user.hasSnapTradeConnection && (
                          <Badge variant="secondary" className="mr-2">SnapTrade</Badge>
                        )}
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-center">
                      <div>
                        <div className="text-sm font-medium">{user.statistics.unprocessedOrders}</div>
                        <div className="text-xs text-gray-500">Unprocessed Orders</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{user.statistics.totalTrades}</div>
                        <div className="text-xs text-gray-500">Total Trades</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{user.statistics.openTrades}</div>
                        <div className="text-xs text-gray-500">Open</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{user.statistics.completedTrades}</div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${user.statistics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${user.statistics.totalPnL.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Total P&L</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {user.statistics.lastTradeCalculation ? (
                        <div className="text-xs text-gray-500">
                          Last calc: {new Date(user.statistics.lastTradeCalculation).toLocaleDateString()}
                        </div>
                      ) : (
                        <Badge variant="secondary">Never calculated</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Sync History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Sync History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{log.userEmail}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.startedAt).toLocaleString()}
                        {log.duration && ` • ${log.duration}s`}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{log.activitiesFound}</div>
                      <div className="text-xs text-gray-500">Activities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{log.ordersCreated}</div>
                      <div className="text-xs text-gray-500">Orders</div>
                    </div>
                    <div className="text-center">
                      <Badge variant={log.dataReturned ? "default" : "secondary"}>
                        {log.dataReturned ? "Data" : "No Data"}
                      </Badge>
                    </div>
                    <div>
                      {getStatusBadge(log.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}