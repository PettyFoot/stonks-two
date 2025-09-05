'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  RefreshCw, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Settings,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { BrokerConnectionData, SyncLogData } from '@/lib/snaptrade/types';
import { ConnectionStatus } from '@prisma/client';
import { toast } from 'sonner';

interface BrokerConnectionCardProps {
  connection: BrokerConnectionData;
  onSync: (connectionId: string) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
  onUpdateSettings: (connectionId: string, settings: { autoSyncEnabled: boolean }) => Promise<void>;
  syncHistory?: SyncLogData[];
  isSyncing?: boolean;
}

export default function BrokerConnectionCard({
  connection,
  onSync,
  onDisconnect,
  onUpdateSettings,
  syncHistory = [],
  isSyncing = false
}: BrokerConnectionCardProps) {
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleSyncToggle = async (enabled: boolean) => {
    setIsUpdatingSettings(true);
    try {
      await onUpdateSettings(connection.id, { autoSyncEnabled: enabled });
      toast.success(`Auto-sync ${enabled ? 'enabled' : 'disabled'} for ${connection.brokerName}`);
    } catch (error) {
      toast.error('Failed to update sync settings');
      console.error('Error updating sync settings:', error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleManualSync = async () => {
    try {
      await onSync(connection.id);
      toast.success('Sync completed successfully');
    } catch (error) {
      toast.error('Sync failed');
      console.error('Error syncing:', error);
    }
  };

  const handleDisconnect = async () => {
    if (confirm(`Are you sure you want to disconnect from ${connection.brokerName}? This will remove all sync settings but preserve your imported trades.`)) {
      try {
        await onDisconnect(connection.id);
        toast.success(`Disconnected from ${connection.brokerName}`);
      } catch (error) {
        toast.error('Failed to disconnect');
        console.error('Error disconnecting:', error);
      }
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'ACTIVE': return 'text-theme-green';
      case 'ERROR': return 'text-theme-red';
      case 'INACTIVE': return 'text-theme-secondary-text';
      case 'EXPIRED': return 'text-theme-warning';
      default: return 'text-theme-secondary-text';
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-4 w-4" />;
      case 'ERROR': return <AlertCircle className="h-4 w-4" />;
      case 'INACTIVE': return <Clock className="h-4 w-4" />;
      case 'EXPIRED': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const latestSync = syncHistory[0];
  const successfulSyncs = syncHistory.filter(sync => sync.status === 'COMPLETED').length;
  const totalTrades = syncHistory.reduce((sum, sync) => sum + sync.tradesImported, 0);

  return (
    <Card className="bg-surface border-default hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tertiary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-theme-tertiary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-primary">
                {connection.brokerName}
              </CardTitle>
              {connection.accountName && (
                <p className="text-sm text-muted mt-1">
                  Account: {connection.accountName}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 ${getStatusColor(connection.status)}`}>
              {getStatusIcon(connection.status)}
              <Badge variant={connection.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                {connection.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Message */}
        {connection.lastSyncError && connection.status === 'ERROR' && (
          <div className="p-3 bg-theme-red/10 border border-theme-red/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-theme-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-theme-red">Sync Error</p>
                <p className="text-xs text-theme-red mt-1">{connection.lastSyncError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sync Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{totalTrades}</div>
            <div className="text-xs text-muted">Total Trades</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-theme-green">{successfulSyncs}</div>
            <div className="text-xs text-muted">Successful Syncs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-tertiary">
              {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-xs text-muted">Last Sync</div>
          </div>
        </div>

        {/* Auto-sync Toggle */}
        <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-default">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted" />
            <span className="text-sm font-medium text-primary">Auto-sync</span>
          </div>
          <Switch
            checked={connection.autoSyncEnabled}
            onCheckedChange={handleSyncToggle}
            disabled={isUpdatingSettings || connection.status !== 'ACTIVE'}
          />
        </div>

        {/* Last Sync Info */}
        {latestSync && (
          <div className="p-3 bg-surface rounded-lg border border-default">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary">Recent Sync</span>
              <Badge variant={latestSync.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">
                {latestSync.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted">Imported:</span>
                <span className="text-theme-green font-medium ml-1">{latestSync.tradesImported}</span>
              </div>
              <div>
                <span className="text-muted">Errors:</span>
                <span className="text-theme-red font-medium ml-1">{latestSync.errorCount}</span>
              </div>
            </div>
            {latestSync.startedAt && (
              <div className="text-xs text-muted mt-2">
                {new Date(latestSync.startedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleManualSync}
            disabled={isSyncing || connection.status !== 'ACTIVE'}
            size="sm"
            className="flex-1 bg-theme-tertiary hover:bg-theme-tertiary/90 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            History
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDisconnect}
            size="sm"
            className="text-theme-red hover:text-theme-red hover:bg-theme-red/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Sync History Details */}
        {showDetails && syncHistory.length > 0 && (
          <div className="border-t border-default pt-4">
            <h4 className="text-sm font-medium text-primary mb-3">Sync History</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {syncHistory.slice(0, 5).map((sync) => (
                <div key={sync.id} className="flex items-center justify-between p-2 bg-surface rounded border border-default">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted" />
                    <span className="text-xs text-muted">
                      {new Date(sync.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sync.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">
                      {sync.status}
                    </Badge>
                    <span className="text-xs text-theme-green">+{sync.tradesImported}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}