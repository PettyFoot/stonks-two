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
  Calendar,
  Database,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  FileText,
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

export default function SnapTradeAdminPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [users, setUsers] = useState<SnapTradeUser[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [configChanged, setConfigChanged] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadConfig(),
        loadUsers(),
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

      if (response.ok) {
        alert(`Sync completed! ${data.successful}/${data.processed} users synced successfully. ${data.totalTradesImported} total trades imported.`);
        setSelectedUsers(new Set());
        await Promise.all([loadUsers(), loadLogs()]);
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

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
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
                {selectedUsers.size > 0 && (
                  <Button
                    onClick={triggerSync}
                    disabled={syncing}
                    className="ml-auto"
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
                    </div>
                    <div className="text-right">
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