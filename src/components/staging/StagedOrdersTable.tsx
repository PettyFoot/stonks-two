'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Database, RefreshCw, InfoIcon, Clock, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StagedOrder {
  id: string;
  rowIndex: number;
  migrationStatus: 'PENDING' | 'APPROVED' | 'MIGRATING' | 'MIGRATED' | 'FAILED' | 'REJECTED';
  createdAt: string;
  brokerFormat: {
    formatName: string;
    brokerName: string;
  };
  preview: {
    symbol: string;
    quantity: string;
    side: string;
    price: string;
    date: string;
  };
  mappingConfidence: number;
}

interface StagedOrdersTableProps {
  orders: StagedOrder[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING: 'outline',
    APPROVED: 'secondary',
    MIGRATING: 'secondary',
    MIGRATED: 'default',
    FAILED: 'destructive',
    REJECTED: 'destructive',
  };

  const colors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    MIGRATING: 'bg-purple-100 text-purple-800',
    MIGRATED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  return (
    <Badge variant={variants[status] || 'outline'} className={colors[status]}>
      <Clock className="h-3 w-3 mr-1" />
      {status === 'PENDING' ? 'Pending Approval' : status}
    </Badge>
  );
};

const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 0.8) {
    return <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>;
  } else if (confidence >= 0.6) {
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
  } else {
    return <Badge variant="destructive" className="bg-red-100 text-red-800">Low</Badge>;
  }
};

export function StagedOrdersTable({ orders, isLoading = false, onRefresh }: StagedOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No staged orders</h3>
          <p className="text-sm text-gray-500">
            Upload a CSV file to begin importing trades
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-amber-300 bg-amber-50/30">
      <CardHeader className="bg-amber-100/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600" />
            Staged Orders (Not in Production)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-100">
              Staging Environment
            </Badge>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Information alert */}
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            These orders are awaiting format approval. They will not appear in
            your trading metrics until approved by our team.
          </AlertDescription>
        </Alert>

        {/* Watermark background */}
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
            <span className="text-8xl font-bold text-amber-600 rotate-[-15deg]">
              STAGING
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50/50">
                <TableHead>Order Details</TableHead>
                <TableHead>Broker Format</TableHead>
                <TableHead>AI Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="opacity-75 hover:opacity-100 transition-opacity"
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {order.preview.symbol} - {order.preview.quantity} shares
                      </div>
                      <div className="text-sm text-gray-600">
                        {order.preview.side} {order.preview.price !== 'N/A' && `@ $${order.preview.price}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Row {order.rowIndex + 1} • {order.preview.date !== 'N/A' ? formatDate(new Date(order.preview.date)) : 'No date'}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium">{order.brokerFormat.formatName}</div>
                      <div className="text-sm text-gray-600">
                        {order.brokerFormat.brokerName}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {getConfidenceBadge(order.mappingConfidence)}
                    <div className="text-xs text-gray-500 mt-1">
                      {(order.mappingConfidence * 100).toFixed(1)}%
                    </div>
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(order.migrationStatus)}
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {formatDate(new Date(order.createdAt))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary footer */}
        <div className="mt-4 p-3 bg-amber-100 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium">Staging Summary</span>
            </div>
            <div className="text-gray-600">
              {orders.length} order{orders.length !== 1 ? 's' : ''} pending approval
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}