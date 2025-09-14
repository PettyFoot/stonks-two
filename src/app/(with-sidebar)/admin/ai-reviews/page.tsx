'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';
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
  AlertTriangle,
  MoreVertical,
  CheckCircle,
  XCircle,
  Edit3,
  Brain,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EnhancedMappingReviewTable from '@/components/admin/EnhancedMappingReviewTable';

interface AiIngestReview {
  id: string;
  userId: string;
  brokerCsvFormatId: string;
  processingStatus: string;
  userIndicatedError: boolean;
  adminReviewStatus: string;
  adminNotes: string | null;
  adminReviewedAt: string | null;
  adminReviewedBy: string | null;
  aiConfidence: number;
  mappingAccuracy: number | null;
  dataQualityScore: number | null;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
  brokerCsvFormat: {
    formatName: string;
    description: string | null;
  };
  csvUploadLog: {
    filename: string;
    originalHeaders: string[];
    rowCount: number;
  };
}

export default function AdminAiReviewsPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [reviews, setReviews] = useState<AiIngestReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingReview, setUpdatingReview] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/ai-reviews?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
      } else {
        throw new Error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load AI reviews');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch reviews
  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchReviews();
    }
  }, [isAdmin, isLoading, filter, fetchReviews]);

  const handleReviewAction = async (reviewId: string, action: 'APPROVED' | 'CORRECTED' | 'DISMISSED') => {
    setUpdatingReview(reviewId);
    try {
      const response = await fetch('/api/admin/ai-reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          adminReviewStatus: action,
          adminNotes: '' // Could be expanded to include notes
        }),
      });

      if (response.ok) {
        await fetchReviews();
        toast.success(`Review ${action.toLowerCase()}`);
        // Close mapping review if it was open for this review
        if (selectedReviewId === reviewId) {
          setSelectedReviewId(null);
        }
      } else {
        throw new Error('Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
    } finally {
      setUpdatingReview(null);
    }
  };

  const handleViewDetails = (reviewId: string) => {
    setSelectedReviewId(reviewId);
  };

  const handleMappingsUpdated = async () => {
    await fetchReviews();
    setSelectedReviewId(null);
  };

  const handleCloseMappingReview = () => {
    setSelectedReviewId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'outline',
      IN_REVIEW: 'secondary',
      APPROVED: 'default',
      CORRECTED: 'secondary',
      DISMISSED: 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredReviews = reviews.filter(review => {
    switch (filter) {
      case 'pending':
        return review.adminReviewStatus === 'PENDING';
      case 'reviewed':
        return ['APPROVED', 'CORRECTED', 'DISMISSED'].includes(review.adminReviewStatus);
      default:
        return true;
    }
  });

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
      <TopBar title="AI Review Queue" showTimeRangeFilters={false} />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="h-6 w-6 text-purple-600" />
                AI Mapping Reviews
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve AI-generated CSV column mappings
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-4">
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Pending ({reviews.filter(r => r.adminReviewStatus === 'PENDING').length})
            </Button>
            <Button
              variant={filter === 'reviewed' ? 'default' : 'outline'}
              onClick={() => setFilter('reviewed')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Reviewed ({reviews.filter(r => ['APPROVED', 'CORRECTED', 'DISMISSED'].includes(r.adminReviewStatus)).length})
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All ({reviews.length})
            </Button>
          </div>

          {/* Reviews Table */}
          <Card>
            <CardHeader>
              <CardTitle>AI Ingest Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredReviews.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No reviews found for the selected filter</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File & User</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>AI Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReviews.map((review) => (
                      <TableRow
                        key={review.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedReviewId === review.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50'
                        )}
                        onClick={() => handleViewDetails(review.id)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{review.csvUploadLog.filename}</div>
                            <div className="text-sm text-gray-600">
                              {review.user.name || review.user.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              {review.csvUploadLog.rowCount} rows
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{review.brokerCsvFormat.formatName}</div>
                            {review.brokerCsvFormat.description && (
                              <div className="text-sm text-gray-600">
                                {review.brokerCsvFormat.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${getConfidenceColor(review.aiConfidence)}`}>
                            {(review.aiConfidence * 100).toFixed(1)}%
                          </div>
                          {review.userIndicatedError && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              User Flagged
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(review.adminReviewStatus)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(review.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={updatingReview === review.id}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(review.id)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Review Mappings
                              </DropdownMenuItem>
                              {review.adminReviewStatus === 'PENDING' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleReviewAction(review.id, 'APPROVED')}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleReviewAction(review.id, 'CORRECTED')}
                                    className="text-blue-600"
                                  >
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Mark as Corrected
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleReviewAction(review.id, 'DISMISSED')}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Dismiss
                                  </DropdownMenuItem>
                                </>
                              )}
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

          {/* Mapping Review Table */}
          {selectedReviewId && (
            <EnhancedMappingReviewTable
              reviewId={selectedReviewId}
              onMappingsUpdated={handleMappingsUpdated}
              onClose={handleCloseMappingReview}
            />
          )}

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">About AI Mapping Reviews</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• AI automatically maps CSV columns to database fields</li>
                <li>• Low confidence scores or user flags require admin review</li>
                <li>• Approved mappings improve future AI accuracy</li>
                <li>• Corrected mappings help train the AI system</li>
                <li>• Dismissed reviews are removed from the queue</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}