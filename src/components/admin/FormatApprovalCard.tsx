'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Database,
  Settings,
  Eye
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface PendingFormat {
  id: string;
  formatName: string;
  description: string | null;
  confidence: number;
  createdAt: string;
  broker: {
    id: string;
    name: string;
  };
  headers: string[];
  sampleData: any[];
  fieldMappings: any;
  pendingOrdersCount: number;
  usageCount: number;
  aiIngestCheck: {
    id: string;
    aiConfidence: number;
    userIndicatedError: boolean;
    adminReviewStatus: string;
    createdAt: string;
    user: {
      email: string;
      name: string | null;
    };
  } | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface FormatApprovalCardProps {
  format: PendingFormat;
  onApprove: (formatId: string, correctedMappings?: any) => Promise<void>;
  onReject: (formatId: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
}

const getPriorityBadge = (priority: string) => {
  const variants: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  };

  return (
    <Badge className={variants[priority] || variants.LOW}>
      {priority} Priority
    </Badge>
  );
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
};

export function FormatApprovalCard({
  format,
  onApprove,
  onReject,
  isProcessing = false
}: FormatApprovalCardProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [correctedMappings, setCorrectedMappings] = useState(format.fieldMappings);
  const [previewMode, setPreviewMode] = useState(false);

  const handleApprove = async () => {
    try {
      await onApprove(format.id, correctedMappings);
      toast.success(`Format "${format.formatName}" approved successfully`);
    } catch (error) {
      toast.error('Failed to approve format');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await onReject(format.id, rejectReason);
      toast.success(`Format "${format.formatName}" rejected`);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (error) {
      toast.error('Failed to reject format');
    }
  };

  return (
    <>
      <Card className={`border-2 ${format.priority === 'HIGH' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {format.formatName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {getPriorityBadge(format.priority)}
                <Badge variant="outline">
                  {format.pendingOrdersCount} orders pending
                </Badge>
                <Badge variant="secondary">
                  {format.broker.name}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-semibold ${getConfidenceColor(format.confidence)}`}>
                {(format.confidence * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">AI Confidence</div>
            </div>
          </div>

          {format.description && (
            <p className="text-sm text-gray-600 mt-2">{format.description}</p>
          )}

          {/* User context */}
          {format.aiIngestCheck && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    Uploaded by {format.aiIngestCheck.user.name || format.aiIngestCheck.user.email}
                  </span>
                  {format.aiIngestCheck.userIndicatedError && (
                    <Badge variant="destructive" className="text-xs">
                      User Flagged Error
                    </Badge>
                  )}
                </div>
                <span className="text-gray-500">
                  {formatDate(new Date(format.aiIngestCheck.createdAt))}
                </span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="mappings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mappings">
                <Settings className="h-4 w-4 mr-1" />
                Mappings
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-1" />
                Data Preview
              </TabsTrigger>
              <TabsTrigger value="headers">
                <Database className="h-4 w-4 mr-1" />
                Headers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mappings" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Field Mappings</h4>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CSV Column</TableHead>
                        <TableHead>Maps To</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(format.fieldMappings).map(([csvHeader, mapping]: [string, any]) => (
                        <TableRow key={csvHeader}>
                          <TableCell className="font-mono text-sm">{csvHeader}</TableCell>
                          <TableCell>
                            {mapping.field || mapping.fields?.join(', ') || 'Unmapped'}
                          </TableCell>
                          <TableCell>
                            <div className={`text-sm ${getConfidenceColor(mapping.confidence || 0)}`}>
                              {((mapping.confidence || 0) * 100).toFixed(1)}%
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Sample Data</h4>
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {format.headers.slice(0, 6).map((header) => (
                          <TableHead key={header} className="font-mono text-xs">
                            {header}
                          </TableHead>
                        ))}
                        {format.headers.length > 6 && (
                          <TableHead className="text-xs">...</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {format.sampleData.slice(0, 3).map((row, idx) => (
                        <TableRow key={idx}>
                          {format.headers.slice(0, 6).map((header) => (
                            <TableCell key={header} className="text-xs max-w-24 truncate">
                              {row[header] || '-'}
                            </TableCell>
                          ))}
                          {format.headers.length > 6 && (
                            <TableCell className="text-xs">...</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="headers" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">CSV Headers ({format.headers.length})</h4>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {format.headers.map((header) => (
                    <Badge key={header} variant="outline" className="text-xs font-mono">
                      {header}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Warning for low confidence */}
          {format.confidence < 0.7 && (
            <Alert className="mt-4 bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This format has low AI confidence ({(format.confidence * 100).toFixed(1)}%).
                Please review the mappings carefully before approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve & Migrate ({format.pendingOrdersCount})
            </Button>

            <Button
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>

            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {previewMode ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Format</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{format.formatName}".
              This will help improve our AI mapping accuracy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Explain why this format is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Reject Format
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}