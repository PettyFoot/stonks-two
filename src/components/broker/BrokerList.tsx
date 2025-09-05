'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock
} from 'lucide-react';
import BrokerConnectionCard from './BrokerConnectionCard';
import ConnectBrokerModal from './ConnectBrokerModal';
import { BrokerConnectionData, SyncLogData } from '@/lib/snaptrade/types';
import { toast } from 'sonner';

interface BrokerListProps {
  onConnectionsChange?: () => void;
}

export default function BrokerList({ onConnectionsChange }: BrokerListProps) {
  const [connections, setConnections] = useState<BrokerConnectionData[]>([]);
  const [syncHistory, setSyncHistory] = useState<Record<string, SyncLogData[]>>({});
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncingConnections, setSyncingConnections] = useState<Set<string>>(new Set());
  const [snapTradeConfigured, setSnapTradeConfigured] = useState(false);

  useEffect(() => {
    checkSnapTradeConfiguration();
    loadConnections();
  }, []);

  const checkSnapTradeConfiguration = async () => {
    try {
      const response = await fetch('/api/snaptrade/auth');
      if (response.ok) {
        const data = await response.json();
        setSnapTradeConfigured(data.configured);
      }
    } catch (error) {
      console.error('Error checking SnapTrade configuration:', error);
    }
  };

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/snaptrade/connections');
      
      if (!response.ok) {
        throw new Error('Failed to load broker connections');
      }

      const data = await response.json();
      setConnections(data.connections || []);

      // Load sync history for each connection
      if (data.connections?.length > 0) {
        await loadSyncHistoryForConnections(data.connections);
      }

    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load broker connections');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncHistoryForConnections = async (connections: BrokerConnectionData[]) => {
    const historyPromises = connections.map(async (connection) => {
      try {
        const response = await fetch(`/api/snaptrade/sync?connectionId=${connection.id}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          return { connectionId: connection.id, history: data.syncHistory || [] };
        }
        return { connectionId: connection.id, history: [] };
      } catch (error) {
        console.error(`Error loading sync history for ${connection.id}:`, error);
        return { connectionId: connection.id, history: [] };
      }
    });

    const histories = await Promise.all(historyPromises);
    const historyMap = histories.reduce((acc, { connectionId, history }) => {
      acc[connectionId] = history;
      return acc;
    }, {} as Record<string, SyncLogData[]>);

    setSyncHistory(historyMap);
  };

  const handleSync = async (connectionId: string) => {
    setSyncingConnections(prev => new Set(prev).add(connectionId));
    
    try {
      const response = await fetch('/api/snaptrade/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync trades');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Sync completed: ${result.tradesImported} trades imported`);
      } else {
        toast.error(`Sync failed: ${result.errors?.[0] || 'Unknown error'}`);
      }

      // Reload connections and sync history
      await loadConnections();
      onConnectionsChange?.();

    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Failed to sync trades');
    } finally {
      setSyncingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch('/api/snaptrade/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      // Remove connection from local state
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      setSyncHistory(prev => {
        const newHistory = { ...prev };
        delete newHistory[connectionId];
        return newHistory;
      });

      onConnectionsChange?.();

    } catch (error) {
      throw error; // Let the card component handle the error
    }
  };

  const handleUpdateSettings = async (
    connectionId: string, 
    settings: { autoSyncEnabled: boolean }
  ) => {
    try {
      const response = await fetch('/api/snaptrade/connections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, ...settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      
      // Update connection in local state
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, ...data.connection }
            : conn
        )
      );

    } catch (error) {
      throw error; // Let the card component handle the error
    }
  };

  const handleConnectionComplete = () => {
    setIsConnectModalOpen(false);
    loadConnections();
    onConnectionsChange?.();
    toast.success('Broker connected successfully!');
  };

  if (!snapTradeConfigured) {
    return (
      <Card className="bg-gradient-to-r from-theme-warning/10 to-theme-warning/5 border-theme-warning/30">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-theme-warning mx-auto mb-4" />
          <h3 className="font-semibold text-theme-warning mb-2">SnapTrade Not Configured</h3>
          <p className="text-sm text-theme-warning">
            Broker connections are not available because SnapTrade is not configured on this server.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-surface border-default">
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 text-theme-tertiary mx-auto mb-4 animate-spin" />
          <p className="text-sm text-theme-secondary-text">Loading broker connections...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-theme-primary-text">
            Connected Brokers
          </h2>
          <p className="text-sm text-theme-secondary-text">
            Manage your broker connections and sync settings
          </p>
        </div>
        
        <Button
          onClick={() => setIsConnectModalOpen(true)}
          className="bg-theme-tertiary hover:bg-theme-tertiary/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Connect Broker
        </Button>
      </div>

      {/* Connection Status Summary */}
      {connections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-surface border-default">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-theme-tertiary" />
                <span className="text-xl font-bold text-theme-primary-text">
                  {connections.length}
                </span>
              </div>
              <p className="text-sm text-theme-secondary-text">
                Connected Brokers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-default">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-theme-green" />
                <span className="text-xl font-bold text-theme-primary-text">
                  {connections.filter(c => c.status === 'ACTIVE').length}
                </span>
              </div>
              <p className="text-sm text-theme-secondary-text">
                Active Connections
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-default">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-theme-tertiary" />
                <span className="text-xl font-bold text-theme-primary-text">
                  {connections.filter(c => c.autoSyncEnabled).length}
                </span>
              </div>
              <p className="text-sm text-theme-secondary-text">
                Auto-sync Enabled
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connections List */}
      {connections.length > 0 ? (
        <div className="grid gap-6">
          {connections.map((connection) => (
            <BrokerConnectionCard
              key={connection.id}
              connection={connection}
              syncHistory={syncHistory[connection.id] || []}
              isSyncing={syncingConnections.has(connection.id)}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
              onUpdateSettings={handleUpdateSettings}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-gradient-to-r from-theme-tertiary/10 to-theme-tertiary/5 border-theme-tertiary/30">
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-theme-tertiary mx-auto mb-4" />
            <h3 className="font-semibold text-theme-tertiary mb-2">
              No Broker Connections
            </h3>
            <p className="text-sm text-theme-tertiary mb-4">
              Connect your broker to automatically sync your trades and get real-time updates.
            </p>
            <Button
              onClick={() => setIsConnectModalOpen(true)}
              className="bg-theme-tertiary hover:bg-theme-tertiary/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Broker
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connect Broker Modal */}
      <ConnectBrokerModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnectionComplete={handleConnectionComplete}
      />
    </div>
  );
}