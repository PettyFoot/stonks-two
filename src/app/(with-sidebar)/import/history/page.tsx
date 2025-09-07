'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  MoreVertical,
  Trash2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface ImportBatch {
  id: string;
  filename: string;
  fileSize?: number;
  brokerType: string;
  importType: string;
  status: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
  aiMappingUsed: boolean;
  mappingConfidence?: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    trades: number;
    orders: number;
  };
}

export default function ImportHistoryPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatch, setProcessingBatch] = useState<string | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch import batches
  useEffect(() => {
    if (user) {
      fetchImportBatches();
    }
  }, [user]);

  const fetchImportBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/import-batches');
      const data = await response.json();
      setImportBatches(data);
    } catch (error) {
      console.error('Error fetching import batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this import batch and all associated data?')) {
      return;
    }

    setProcessingBatch(batchId);
    try {
      const response = await fetch(`/api/import-batches?batchId=${batchId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchImportBatches();
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
    } finally {
      setProcessingBatch(null);
    }
  };

  const handleReprocess = async (batchId: string, action: string) => {
    setProcessingBatch(batchId);
    try {
      const response = await fetch(`/api/import-batches/${batchId}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchImportBatches();
      }
    } catch (error) {
      console.error('Error reprocessing batch:', error);
    } finally {
      setProcessingBatch(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      COMPLETED: 'default',
      PROCESSING: 'secondary',
      FAILED: 'destructive',
      PENDING: 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PageTriangleLoader />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Import History" showTimeRangeFilters={false} />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import History</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your imported trade data and reprocess batches as needed
              </p>
            </div>
            <Button onClick={() => router.push('/import')}>
              <FileText className="h-4 w-4 mr-2" />
              New Import
            </Button>
          </div>

          {/* Import Batches Table */}
          <Card>
            <CardHeader>
              <CardTitle>Import Batches</CardTitle>
            </CardHeader>
            <CardContent>
              {importBatches.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No import batches found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => router.push('/import')}
                  >
                    Import Your First File
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          {format(new Date(batch.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {batch.filename}
                          {batch.aiMappingUsed && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              AI Mapped
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{batch.brokerType}</TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-green-600">{batch.successCount}</span>
                            {batch.errorCount > 0 && (
                              <span className="text-red-600"> / {batch.errorCount}</span>
                            )}
                            <span className="text-gray-500"> of {batch.totalRecords}</span>
                          </div>
                        </TableCell>
                        <TableCell>{batch._count.trades}</TableCell>
                        <TableCell>{batch._count.orders}</TableCell>
                        <TableCell>{formatFileSize(batch.fileSize)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={processingBatch === batch.id}
                              >
                                {processingBatch === batch.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {batch._count.orders > 0 && (
                                <DropdownMenuItem
                                  onClick={() => handleReprocess(batch.id, 'recalculate')}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Recalculate Trades
                                </DropdownMenuItem>
                              )}
                              {batch._count.trades > 0 && (
                                <DropdownMenuItem
                                  onClick={() => handleReprocess(batch.id, 'delete_trades')}
                                  className="text-orange-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Trades Only
                                </DropdownMenuItem>
                              )}
                              {batch._count.orders > 0 && (
                                <DropdownMenuItem
                                  onClick={() => handleReprocess(batch.id, 'delete_orders')}
                                  className="text-orange-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Orders Only
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Everything
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">About Import Management</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Each import is tracked with a unique batch ID</li>
                <li>• Orders and trades remember which import batch they came from</li>
                <li>• You can reprocess imports to recalculate trades from orders</li>
                <li>• Delete specific imports without affecting other data</li>
                <li>• AI-mapped imports show confidence scores for column detection</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}