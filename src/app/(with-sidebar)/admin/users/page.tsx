'use client';

import React, { useState, useEffect } from 'react';
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
  Users, 
  MoreVertical,
  Shield,
  ShieldOff,
  User,
  Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    trades: number;
    orders: number;
    importBatches: number;
  };
}

export default function AdminUsersPage() {
  const { isAdmin, isLoading, user: currentUser } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Fetch users
  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchUsers();
    }
  }, [isAdmin, isLoading]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (userId === currentUser.id) {
      toast.error("You cannot change your own admin status");
      return;
    }

    setUpdatingUser(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          isAdmin: !currentIsAdmin 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(prev => 
          prev.map(u => 
            u.id === userId 
              ? { ...u, isAdmin: data.user.isAdmin }
              : u
          )
        );
        toast.success(
          `User ${!currentIsAdmin ? 'promoted to' : 'removed from'} admin role`
        );
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user admin status');
    } finally {
      setUpdatingUser(null);
    }
  };

  const getSubscriptionBadge = (tier: string, status: string) => {
    if (status === 'ACTIVE') {
      return (
        <Badge variant={tier === 'PREMIUM' ? 'default' : 'secondary'}>
          {tier}
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        {tier}
      </Badge>
    );
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
      <TopBar title="User Management" showTimeRangeFilters={false} />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                User Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage users and administrative roles
              </p>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-xl font-bold text-gray-900">
                    {users.length}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Total Users</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-xl font-bold text-gray-900">
                    {users.filter(u => u.isAdmin).length}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Admin Users</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-purple-600" />
                  <span className="text-xl font-bold text-gray-900">
                    {users.filter(u => u.subscriptionTier === 'PREMIUM').length}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Premium Users</p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name || 'N/A'}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.isAdmin ? (
                            <>
                              <Shield className="h-4 w-4 text-green-600" />
                              <Badge variant="default">Admin</Badge>
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4 text-gray-400" />
                              <Badge variant="outline">User</Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(user.subscriptionTier, user.subscriptionStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{user._count.trades} trades</div>
                          <div className="text-gray-600">{user._count.importBatches} imports</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={updatingUser === user.id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                              disabled={user.id === currentUser.id}
                            >
                              {user.isAdmin ? (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Remove Admin
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Make Admin
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}