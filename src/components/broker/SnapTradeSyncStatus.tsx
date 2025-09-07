'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, RefreshCw, AlertCircle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, formatDistanceToNow } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SyncStatus } from '@prisma/client';

interface SyncInfo {
  rateLimitInfo: {
    allowed: boolean;
    remaining: number;
    resetTime: string;
    total: number;
  };
  syncStats: {
    manualSyncsToday: number;
    lastSyncAt: string | null;
    nextResetTime: string;
  };
  hasRunningSyncs: boolean;
  currentSync: {
    id: string;
    status: SyncStatus;
    startedAt: string;
    activitiesFound: number;
    ordersCreated: number;
  } | null;
  lastSync: {
    id: string;
    status: SyncStatus;
    startedAt: string;
    completedAt: string;
    activitiesFound: number;
    ordersCreated: number;
    errors: string[] | null;
  } | null;
  nextAutoSyncAt: string;
  canManualSync: boolean;
  syncsRemaining: number;
  hoursUntilReset: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

export function SnapTradeSyncStatus() {
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    to: new Date()
  });
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/snaptrade/sync-status');
      if (response.ok) {
        const data = await response.json();
        setSyncInfo(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch sync status');
      }
    } catch (err) {
      setError('Network error while fetching sync status');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and polling for running syncs
  useEffect(() => {
    fetchSyncStatus();
    
    const interval = setInterval(() => {
      if (syncInfo?.hasRunningSyncs || syncing) {
        fetchSyncStatus();
      }
    }, 3000); // Poll every 3 seconds when sync is running

    return () => clearInterval(interval);
  }, [syncInfo?.hasRunningSyncs, syncing]);

  // Manual sync
  const handleManualSync = async () => {
    if (!syncInfo?.canManualSync) return;

    setSyncing(true);
    setError(null);
    setLastSyncResult(null);

    try {
      const response = await fetch('/api/snaptrade/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateFrom: dateRange.from.toISOString(),
          dateTo: dateRange.to.toISOString(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setLastSyncResult(result);
        fetchSyncStatus(); // Refresh status
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (err) {
      setError('Network error during sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading sync status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = (status: SyncStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      formatted: format(date, 'MMM dd, yyyy HH:mm'),
      relative: formatDistanceToNow(date, { addSuffix: true })
    };
  };

  return (
    <div className="space-y-4">
      {/* Main Sync Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                SnapTrade Sync Status
              </CardTitle>
              <CardDescription>
                Automatic daily sync at 1:00 AM • Manual sync: {syncInfo?.syncsRemaining}/5 remaining today
              </CardDescription>
            </div>
            {syncInfo?.hasRunningSyncs && (
              <Badge variant="outline" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Status</span>
                {syncInfo?.currentSync ? (
                  getStatusBadge(syncInfo.currentSync.status)
                ) : (
                  <Badge variant="secondary">Idle</Badge>
                )}
              </div>

              {syncInfo?.currentSync && (
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Started: {formatDate(syncInfo.currentSync.startedAt).relative}</div>
                  <div>Activities: {syncInfo.currentSync.activitiesFound}</div>
                  <div>Orders: {syncInfo.currentSync.ordersCreated}</div>
                </div>
              )}

              {syncInfo?.lastSync && !syncInfo?.hasRunningSyncs && (
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Last sync: {formatDate(syncInfo.lastSync.completedAt).relative}</div>
                  <div>{syncInfo.lastSync.ordersCreated} orders from {syncInfo.lastSync.activitiesFound} activities</div>
                  {syncInfo.lastSync.errors && (
                    <div className="text-red-600">Errors: {syncInfo.lastSync.errors.length}</div>
                  )}
                </div>
              )}
            </div>

            {/* Next Auto Sync */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Auto Sync</span>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Daily at 1 AM
                </Badge>
              </div>
              <div className="text-xs text-gray-600">
                {formatDate(syncInfo?.nextAutoSyncAt || new Date().toISOString()).formatted}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Sync</CardTitle>
          <CardDescription>
            Import activities from SnapTrade for a specific date range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select date range"
            />
          </div>

          {!syncInfo?.canManualSync && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {syncInfo?.syncsRemaining === 0 
                  ? `Daily manual sync limit reached. Resets in ${syncInfo?.hoursUntilReset} hours.`
                  : 'Cannot sync: A sync is already in progress.'
                }
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleManualSync}
            disabled={!syncInfo?.canManualSync || syncing}
            className="w-full"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now ({syncInfo?.syncsRemaining} remaining)
              </>
            )}
          </Button>

          {lastSyncResult && (
            <Alert className={lastSyncResult.success ? 'border-green-200' : 'border-red-200'}>
              <AlertDescription>
                {lastSyncResult.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {lastSyncResult.message}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 inline mr-1" />
                    {lastSyncResult.message || lastSyncResult.errors?.join(', ')}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}