'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import TopBar from '@/components/TopBar';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  TrendingUp,
  Users,
  Star,
  MessageCircle,
  Search,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FeedbackResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  question1Rating: number;
  question2Rating: number;
  question3Rating: number;
  question4Rating: number;
  question5Rating: number;
  comment: string | null;
  submittedAt: string;
  averageRating: number;
  user: {
    subscriptionTier: string;
    subscriptionStatus: string;
  };
}

interface FeedbackStats {
  totalResponses: number;
  avgQuestion1: number;
  avgQuestion2: number;
  avgQuestion3: number;
  avgQuestion4: number;
  avgQuestion5: number;
  overallAvg: number;
  responsesWithComments: number;
}

export default function AdminFeedbackPage() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FeedbackResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchFeedbackResponses();
    }
  }, [isAdmin, isLoading]);

  const fetchFeedbackResponses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/feedback/responses');
      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses);
        setStats(data.stats);
      } else {
        throw new Error('Failed to fetch feedback responses');
      }
    } catch (error) {
      console.error('Error fetching feedback responses:', error);
      toast.error('Failed to load feedback responses');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (response: FeedbackResponse) => {
    setSelectedResponse(response);
    setDetailsOpen(true);
  };

  const handleExportCSV = () => {
    if (responses.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Date',
      'User Name',
      'User Email',
      'Subscription',
      'Q1: Navigation',
      'Q2: Analytics',
      'Q3: Visualizations',
      'Q4: Performance',
      'Q5: Recommend',
      'Average',
      'Comment'
    ];

    const csvContent = [
      headers.join(','),
      ...responses.map(r => [
        format(new Date(r.submittedAt), 'yyyy-MM-dd HH:mm'),
        `"${r.userName}"`,
        r.userEmail,
        r.user.subscriptionTier,
        r.question1Rating,
        r.question2Rating,
        r.question3Rating,
        r.question4Rating,
        r.question5Rating,
        r.averageRating,
        `"${r.comment?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-responses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Feedback data exported successfully');
  };

  const filteredResponses = responses.filter(response =>
    searchQuery === '' ||
    response.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    response.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 8) return 'default';
    if (rating >= 6) return 'secondary';
    return 'destructive';
  };

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
      <TopBar title="Feedback Responses" showTimeRangeFilters={false} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-600" />
                User Feedback
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor and analyze user feedback responses
              </p>
            </div>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-xl font-bold text-gray-900">
                      {stats.totalResponses}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Total Responses</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className={`text-xl font-bold ${getRatingColor(stats.overallAvg)}`}>
                      {stats.overallAvg}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Overall Average</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className={`text-xl font-bold ${getRatingColor(stats.avgQuestion5)}`}>
                      {stats.avgQuestion5}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">NPS (Recommend)</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MessageCircle className="h-5 w-5 text-purple-600" />
                    <span className="text-xl font-bold text-gray-900">
                      {stats.responsesWithComments}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">With Comments</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Question Averages */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Ratings by Question</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">1. Navigation & Usability</span>
                    <Badge variant={getRatingBadge(stats.avgQuestion1)}>{stats.avgQuestion1}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">2. Analytics & Insights</span>
                    <Badge variant={getRatingBadge(stats.avgQuestion2)}>{stats.avgQuestion2}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">3. Data Visualizations</span>
                    <Badge variant={getRatingBadge(stats.avgQuestion3)}>{stats.avgQuestion3}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">4. Performance & Speed</span>
                    <Badge variant={getRatingBadge(stats.avgQuestion4)}>{stats.avgQuestion4}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">5. Likelihood to Recommend</span>
                    <Badge variant={getRatingBadge(stats.avgQuestion5)}>{stats.avgQuestion5}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Responses Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Feedback Responses</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Avg Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        {searchQuery ? 'No feedback responses match your search' : 'No feedback responses yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResponses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>
                          {format(new Date(response.submittedAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{response.userName}</div>
                            <div className="text-sm text-gray-600">{response.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={response.user.subscriptionTier === 'PREMIUM' ? 'default' : 'secondary'}>
                            {response.user.subscriptionTier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRatingBadge(response.averageRating)}>
                            {response.averageRating}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {response.comment ? (
                            <span className="text-sm text-gray-600 truncate block max-w-xs">
                              {response.comment.substring(0, 50)}{response.comment.length > 50 ? '...' : ''}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">No comment</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(response)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">User</p>
                  <p className="font-medium">{selectedResponse.userName}</p>
                  <p className="text-gray-600">{selectedResponse.userEmail}</p>
                </div>
                <div>
                  <p className="text-gray-600">Submitted</p>
                  <p className="font-medium">{format(new Date(selectedResponse.submittedAt), 'PPpp')}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold">Ratings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">1. Navigation & Usability</span>
                    <Badge>{selectedResponse.question1Rating}/10</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">2. Analytics & Insights</span>
                    <Badge>{selectedResponse.question2Rating}/10</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">3. Data Visualizations</span>
                    <Badge>{selectedResponse.question3Rating}/10</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">4. Performance & Speed</span>
                    <Badge>{selectedResponse.question4Rating}/10</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">5. Likelihood to Recommend</span>
                    <Badge>{selectedResponse.question5Rating}/10</Badge>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Average Rating</span>
                    <Badge variant={getRatingBadge(selectedResponse.averageRating)}>
                      {selectedResponse.averageRating}/10
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedResponse.comment && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Additional Comments</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {selectedResponse.comment}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}