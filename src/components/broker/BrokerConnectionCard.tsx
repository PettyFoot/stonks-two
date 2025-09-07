'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Trash2, 
  CheckCircle, 
  Clock,
  TrendingUp,
} from 'lucide-react';
// Updated connection interface to match SnapTrade API response
interface SnapTradeConnection {
  id: string;
  snapTradeUserId: string;
  brokerName: string;
  status: 'ACTIVE' | 'INACTIVE';
  accounts: Array<{
    id: string;
    number?: string;
    name?: string;
    type?: string | null;
    balance?: any;
    currency?: string | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
}
import { toast } from 'sonner';

interface BrokerConnectionCardProps {
  connection: SnapTradeConnection;
  onDisconnect: () => Promise<void>;
}

export default function BrokerConnectionCard({
  connection,
  onDisconnect,
}: BrokerConnectionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleDisconnect = async () => {
    if (confirm(`Are you sure you want to disconnect all brokers? This will remove your SnapTrade connection but preserve your imported trades.`)) {
      try {
        await onDisconnect();
        toast.success(`Disconnected from all brokers`);
      } catch (error) {
        toast.error('Failed to disconnect');
        console.error('Error disconnecting:', error);
      }
    }
  };

  const getStatusColor = (status: 'ACTIVE' | 'INACTIVE') => {
    switch (status) {
      case 'ACTIVE': return 'text-theme-green';
      case 'INACTIVE': return 'text-theme-secondary-text';
      default: return 'text-theme-secondary-text';
    }
  };

  const getStatusIcon = (status: 'ACTIVE' | 'INACTIVE') => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-4 w-4" />;
      case 'INACTIVE': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

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
        {/* Account Information */}
        {connection.accounts && connection.accounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary">Connected Accounts</h4>
            {connection.accounts.map((account, index) => (
              <div key={account.id} className="p-3 bg-surface rounded-lg border border-default">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {account.name || account.number || `Account ${index + 1}`}
                    </p>
                    {account.type && (
                      <p className="text-xs text-muted">{account.type}</p>
                    )}
                  </div>
                  {account.balance && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary">
                        {account.currency || '$'} {account.balance.total || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connection Details */}
        {showDetails && (
          <div className="border-t border-default pt-4">
            <h4 className="text-sm font-medium text-primary mb-3">Connection Details</h4>
            <div className="space-y-2 text-xs">
              {connection.createdAt && (
                <div className="flex justify-between">
                  <span className="text-muted">Connected:</span>
                  <span className="text-primary">{new Date(connection.createdAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">SnapTrade ID:</span>
                <span className="text-primary font-mono">{connection.snapTradeUserId}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
            className="flex-1"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDisconnect}
            size="sm"
            className="text-theme-red hover:text-theme-red hover:bg-theme-red/10"
          >
            <Trash2 className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}