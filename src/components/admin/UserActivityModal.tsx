'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Eye, Clock, MousePointerClick } from 'lucide-react';
import { format } from 'date-fns';

interface PageStat {
  path: string;
  visitCount: number;
  totalDuration: number;
  avgDuration: number;
  lastVisited: string;
}

interface ActivitySummary {
  totalPageViews: number;
  uniquePagesVisited: number;
  totalTimeSpent: number;
  lastActive: string | null;
}

interface UserActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

// Format milliseconds to human-readable duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export default function UserActivityModal({
  isOpen,
  onClose,
  userId,
  userName,
}: UserActivityModalProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [dateRange, setDateRange] = useState<string>('30');
  const [sortBy, setSortBy] = useState<'visits' | 'time'>('visits');

  useEffect(() => {
    if (isOpen && userId) {
      fetchActivity();
    }
  }, [isOpen, userId, dateRange]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/users/${userId}/activity?days=${dateRange}`
      );

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setPageStats(data.pageStats);
      } else {
        console.error('Failed to fetch user activity');
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedPageStats = [...pageStats].sort((a, b) => {
    if (sortBy === 'visits') {
      return b.visitCount - a.visitCount;
    } else {
      return b.totalDuration - a.totalDuration;
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Activity - {userName}</DialogTitle>
          <DialogDescription>
            View page visits and time spent on each page
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Time Period:</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>

            <label className="text-sm font-medium ml-4">Sort By:</label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'visits' | 'time')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visits">Most Visited</SelectItem>
                <SelectItem value="time">Most Time Spent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <PageTriangleLoader />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <MousePointerClick className="h-5 w-5 text-blue-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {summary.totalPageViews}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Total Page Views</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Eye className="h-5 w-5 text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {summary.uniquePagesVisited}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Unique Pages</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {formatDuration(summary.totalTimeSpent)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Total Time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          Last Active
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {summary.lastActive
                          ? format(new Date(summary.lastActive), 'MMM dd, yyyy')
                          : 'Never'}
                      </p>
                      {summary.lastActive && (
                        <p className="text-xs text-gray-500">
                          {format(new Date(summary.lastActive), 'h:mm a')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Page Stats Table */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Page Statistics</h3>
                  {sortedPageStats.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page</TableHead>
                          <TableHead className="text-right">Visits</TableHead>
                          <TableHead className="text-right">Total Time</TableHead>
                          <TableHead className="text-right">Avg Time/Visit</TableHead>
                          <TableHead className="text-right">Last Visited</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedPageStats.map((stat) => (
                          <TableRow key={stat.path}>
                            <TableCell className="font-medium">
                              <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                                {stat.path}
                              </code>
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.visitCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatDuration(stat.totalDuration)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatDuration(stat.avgDuration)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {format(new Date(stat.lastVisited), 'MMM dd, h:mm a')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No activity data available for this time period
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}