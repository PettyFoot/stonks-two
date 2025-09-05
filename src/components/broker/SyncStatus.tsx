'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Download
} from 'lucide-react';
import { SyncLogData } from '@/lib/snaptrade/types';
import { SyncStatus as PrismaSyncStatus } from '@prisma/client';

interface SyncStatusProps {
  syncLog?: SyncLogData | null;
  isActive?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function SyncStatus({ 
  syncLog, 
  isActive = false, 
  showDetails = true,
  className = '' 
}: SyncStatusProps) {
  if (!syncLog) {
    return (
      <Card className={`bg-surface border-default ${className}`}>
        <CardContent className="p-4 text-center">
          <Clock className="h-8 w-8 text-theme-secondary-text mx-auto mb-2" />
          <p className="text-sm text-theme-secondary-text">No sync activity</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: PrismaSyncStatus) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-5 w-5 text-theme-green" />;
      case 'FAILED': return <XCircle className="h-5 w-5 text-theme-red" />;
      case 'RUNNING': return <RefreshCw className="h-5 w-5 text-theme-tertiary animate-spin" />;
      case 'PENDING': return <Clock className="h-5 w-5 text-theme-warning" />;
      default: return <AlertTriangle className="h-5 w-5 text-theme-secondary-text" />;
    }
  };

  const getStatusColor = (status: PrismaSyncStatus) => {
    switch (status) {
      case 'COMPLETED': return 'text-theme-green';
      case 'FAILED': return 'text-theme-red';
      case 'RUNNING': return 'text-theme-tertiary';
      case 'PENDING': return 'text-theme-warning';
      default: return 'text-theme-secondary-text';
    }
  };

  const getStatusBadgeVariant = (status: PrismaSyncStatus) => {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'FAILED': return 'destructive';
      case 'RUNNING': return 'default';
      case 'PENDING': return 'secondary';
      default: return 'secondary';
    }
  };

  const calculateProgress = () => {
    if (syncLog.status === 'COMPLETED') return 100;
    if (syncLog.status === 'RUNNING') return 75;
    if (syncLog.status === 'PENDING') return 25;
    return 0;
  };

  const totalTrades = syncLog.tradesImported + syncLog.tradesUpdated + syncLog.tradesSkipped;
  const duration = syncLog.completedAt && syncLog.startedAt 
    ? Math.round((new Date(syncLog.completedAt).getTime() - new Date(syncLog.startedAt).getTime()) / 1000)
    : null;

  return (
    <Card className={`bg-surface border-default ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(syncLog.status)}
            <span className={`font-medium ${getStatusColor(syncLog.status)}`}>
              {syncLog.status === 'RUNNING' && isActive ? 'Syncing...' : syncLog.status}
            </span>
          </div>
          
          <Badge variant={getStatusBadgeVariant(syncLog.status)} className="text-xs">
            {syncLog.syncType}
          </Badge>
        </div>

        {/* Progress bar for running syncs */}
        {(syncLog.status === 'RUNNING' || isActive) && (
          <div className="mb-3">
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        )}

        {/* Sync Statistics */}
        {showDetails && (
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Download className="h-3 w-3 text-theme-green" />
                <span className="text-sm font-bold text-theme-green">
                  {syncLog.tradesImported}
                </span>
              </div>
              <p className="text-xs text-theme-secondary-text">Imported</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-theme-tertiary" />
                <span className="text-sm font-bold text-theme-tertiary">
                  {syncLog.tradesUpdated}
                </span>
              </div>
              <p className="text-xs text-theme-secondary-text">Updated</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-sm font-bold text-theme-secondary-text">
                  {syncLog.tradesSkipped}
                </span>
              </div>
              <p className="text-xs text-theme-secondary-text">Skipped</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {syncLog.status === 'FAILED' && syncLog.errorCount > 0 && (
          <div className="p-2 bg-theme-red/10 border border-theme-red/30 rounded-lg mb-3">
            <div className="flex items-center gap-1 mb-1">
              <XCircle className="h-3 w-3 text-theme-red" />
              <span className="text-xs font-medium text-theme-red">
                {syncLog.errorCount} Error{syncLog.errorCount > 1 ? 's' : ''}
              </span>
            </div>
            {Array.isArray(syncLog.errors) && syncLog.errors.length > 0 && (
              <p className="text-xs text-theme-red">
                {syncLog.errors[0]}
                {syncLog.errors.length > 1 && ` (+${syncLog.errors.length - 1} more)`}
              </p>
            )}
          </div>
        )}

        {/* Sync Details */}
        <div className="text-xs text-theme-secondary-text space-y-1">
          <div className="flex justify-between">
            <span>Started:</span>
            <span>{new Date(syncLog.startedAt).toLocaleString()}</span>
          </div>
          
          {syncLog.completedAt && (
            <div className="flex justify-between">
              <span>Completed:</span>
              <span>{new Date(syncLog.completedAt).toLocaleString()}</span>
            </div>
          )}
          
          {duration !== null && (
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{duration}s</span>
            </div>
          )}

          {totalTrades > 0 && (
            <div className="flex justify-between font-medium">
              <span>Total Processed:</span>
              <span>{totalTrades}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}