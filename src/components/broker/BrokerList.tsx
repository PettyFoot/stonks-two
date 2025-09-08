'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Building2, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  TestTube,
  MoreVertical,
  RotateCcw,
  Trash2
} from 'lucide-react';
import BrokerConnectionCard from './BrokerConnectionCard';
import ConnectBrokerModal from './ConnectBrokerModal';
import { BrokerConnectionData, SyncLogData } from '@/lib/snaptrade/types';

interface LiveConnectionData {
  id: string;
  snapTradeAuthId: string;
  brokerName: string;
  type?: string;
  status: string;
  brokerage?: {
    id: string;
    name: string;
    slug: string;
    display_name?: string;
  };
  accounts: Array<{
    id: string;
    number: string;
    name: string;
    type?: string;
    balance?: any;
    currency?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  isLiveConnection: boolean;
}
import { toast } from 'sonner';

interface BrokerListProps {
  onConnectionsChange?: () => void;
}

export default function BrokerList({ onConnectionsChange }: BrokerListProps) {
  const { user } = useUser();
  const [connections, setConnections] = useState<BrokerConnectionData[]>([]);
  const [liveConnections, setLiveConnections] = useState<LiveConnectionData[]>([]);
  const [syncHistory, setSyncHistory] = useState<Record<string, SyncLogData[]>>({});
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingLive, setLoadingLive] = useState(true);
  const [syncingConnections, setSyncingConnections] = useState<Set<string>>(new Set());
  const [snapTradeConfigured, setSnapTradeConfigured] = useState(false);
  const [testingHoldings, setTestingHoldings] = useState(false);

  useEffect(() => {
    checkSnapTradeConfiguration();
    loadConnections();
    loadLiveConnections();
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

  const loadLiveConnections = async () => {
    try {
      setLoadingLive(true);
      const response = await fetch('/api/snaptrade/connections/live');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, skip loading live connections
          setLiveConnections([]);
          return;
        }
        throw new Error('Failed to load live broker connections');
      }

      const data = await response.json();
      
      if (data.success) {
        setLiveConnections(data.connections || []);
      } else {
        console.warn('Failed to load live connections:', data.error);
        setLiveConnections([]);
      }

    } catch (error) {
      console.error('Error loading live connections:', error);
      // Don't show error toast for live connections as they're supplementary
      setLiveConnections([]);
    } finally {
      setLoadingLive(false);
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

  const handleTestHoldings = async () => {
    if (testingHoldings) return;
    
    setTestingHoldings(true);
    
    try {
      console.log('Testing SnapTrade getUserHoldings API...');
      
      const response = await fetch('/api/snaptrade/holdings');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch holdings');
      }

      const holdingsData = await response.json();
      
      console.log('SnapTrade Holdings API Response:', holdingsData);
      console.log('Full holdings data for analysis:', JSON.stringify(holdingsData, null, 2));
      
      if (holdingsData.success) {
        toast.success(`Holdings fetched successfully! Check console for details. Found ${holdingsData.holdingsData.length} accounts.`);
      } else {
        toast.error('Failed to fetch holdings data');
      }
      
    } catch (error) {
      console.error('Error testing holdings API:', error);
      toast.error(`Holdings API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingHoldings(false);
    }
  };

  const handleConnectionComplete = () => {
    setIsConnectModalOpen(false);
    loadConnections();
    loadLiveConnections();
    onConnectionsChange?.();
    toast.success('Broker connected successfully!');
  };

  const handleReconnectLiveConnection = async (connectionId: string) => {
    try {
      const response = await fetch('/api/snaptrade/connections/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reconnect');
      }

      if (result.redirectUri) {
        // Open reconnection URL in new window
        window.open(result.redirectUri, '_blank', 'width=600,height=700');
        toast.success('Reconnection window opened. Please complete authentication.');
      } else {
        toast.error('Failed to get reconnection URL');
      }

    } catch (error) {
      console.error('Error reconnecting live connection:', error);
      toast.error(`Failed to reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRemoveLiveConnection = async (connectionId: string, brokerName: string) => {
    if (!confirm(`Are you sure you want to remove the ${brokerName} connection? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/snaptrade/connections/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove connection');
      }

      toast.success(`${brokerName} connection removed successfully`);
      
      // Reload live connections to reflect the change
      await loadLiveConnections();

    } catch (error) {
      console.error('Error removing live connection:', error);
      toast.error(`Failed to remove connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        
        <div className="flex items-center gap-3">
          {/* Test Holdings Button - Only for dannyvera127@gmail.com */}
          {user?.email === 'dannyvera127@gmail.com' && (
            <Button
              onClick={handleTestHoldings}
              disabled={testingHoldings}
              variant="outline"
              className="border-theme-tertiary text-theme-tertiary hover:bg-theme-tertiary hover:text-white"
            >
              {testingHoldings ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              {testingHoldings ? 'Testing...' : 'Test Holdings API'}
            </Button>
          )}
          
          <Button
            onClick={() => setIsConnectModalOpen(true)}
            className="bg-theme-tertiary hover:bg-theme-tertiary/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect Broker
          </Button>
        </div>
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
      {connections.length > 0 && (
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
      )}

      {/* Connection Card - Always show */}
      <Card className="bg-gradient-to-r from-theme-tertiary/10 to-theme-tertiary/5 border-theme-tertiary/30">
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 text-theme-tertiary mx-auto mb-4" />
          <h3 className="font-semibold text-theme-tertiary mb-2">
            {connections.length === 0 ? 'No Broker Connections' : `${connections.length} Connection${connections.length === 1 ? '' : 's'}`}
          </h3>
          <p className="text-sm text-theme-tertiary mb-4">
            Connect your broker to automatically sync your trades and get real-time updates.
          </p>
          <Button
            onClick={() => setIsConnectModalOpen(true)}
            className="bg-theme-green hover:bg-theme-tertiary/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {connections.length === 0 ? 'Connect Your First Broker' : 'Connect Another Broker'}
          </Button>
        </CardContent>
      </Card>

      {/* Available SnapTrade Connections */}
      {!loadingLive && liveConnections.length > 0 && (
        <div className="space-y-4">
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary-text">
                  Available SnapTrade Connections
                </h3>
                <p className="text-sm text-theme-secondary-text">
                  Broker connections found in your SnapTrade account
                </p>
              </div>
            </div>
            
            <div className="grid gap-4">
              {liveConnections.map((liveConnection) => (
                <Card key={liveConnection.id} className="bg-surface border-default">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-theme-tertiary/10 rounded-full">
                          <Building2 className="h-6 w-6 text-theme-tertiary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-theme-primary-text">
                            {liveConnection.brokerName}
                          </h4>
                          <p className="text-sm text-theme-secondary-text">
                            Connected via SnapTrade
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={liveConnection.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {liveConnection.status}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => handleReconnectLiveConnection(liveConnection.id)}
                              className="flex items-center gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reconnect
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveLiveConnection(liveConnection.id, liveConnection.brokerName)}
                              variant="destructive"
                              className="flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {liveConnection.accounts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h5 className="text-sm font-medium text-theme-primary-text mb-2">Accounts:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {liveConnection.accounts.map((account) => (
                            <div key={account.id} className="flex items-center justify-between p-2 bg-background rounded-md">
                              <span className="text-sm text-theme-secondary-text">
                                {account.name || account.number} ({account.type || 'Unknown'})
                              </span>
                              {account.balance && (
                                <span className="text-sm font-medium text-theme-primary-text">
                                  {account.currency} {account.balance.total || '0'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
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