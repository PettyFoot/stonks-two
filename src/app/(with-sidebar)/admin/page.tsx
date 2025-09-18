'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import TopBar from '@/components/TopBar';
import { PageTriangleLoader } from '@/components/ui/TriangleLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  AlertTriangle,
  Database,
  TrendingUp,
  Shield,
  Activity,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalImports: number;
  pendingReviews: number;
  totalTrades: number;
  totalOrders: number;
  recentUploads: number;
  systemHealth: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, isLoading, user } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch admin stats
  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchAdminStats();
    }
  }, [isAdmin, isLoading]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
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
      <TopBar title="Admin Dashboard" showTimeRangeFilters={false} />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                System overview and administrative controls
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} active this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Import Batches</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalImports}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.recentUploads} in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingReviews}</div>
                  <p className="text-xs text-muted-foreground">
                    AI mappings awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTrades}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalOrders} orders processed
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push('/admin/users')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">User Management</h3>
                    <p className="text-sm text-gray-600">Manage users and admin roles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push('/admin/ai-reviews')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Reviews</h3>
                    <p className="text-sm text-gray-600">Review AI-mapped imports</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push('/import/history')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Database className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Import Management</h3>
                    <p className="text-sm text-gray-600">View and manage all imports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant={stats?.systemHealth === 'Healthy' ? 'default' : 'destructive'}>
                  {stats?.systemHealth || 'Loading...'}
                </Badge>
                <span className="text-sm text-gray-600">
                  All systems operational
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Administrative Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">System health check completed</span>
                  <span className="text-xs text-gray-400 ml-auto">2 minutes ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Database maintenance completed</span>
                  <span className="text-xs text-gray-400 ml-auto">1 hour ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">New AI ingest review pending</span>
                  <span className="text-xs text-gray-400 ml-auto">3 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}