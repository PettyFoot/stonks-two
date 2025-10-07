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
  Crown,
  Gift,
  Mail,
  Trophy,
  Trash2,
  Activity,
  MessageSquare,
  HandHelping,
  Calculator
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import DeleteUserModal from '@/components/admin/DeleteUserModal';
import UserActivityModal from '@/components/admin/UserActivityModal';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
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
  const [sendingCoupon, setSendingCoupon] = useState<string | null>(null);
  const [sendingWelcome, setSendingWelcome] = useState<string | null>(null);
  const [sendingCongrats, setSendingCongrats] = useState<string | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);
  const [sendingOnboarding, setSendingOnboarding] = useState<string | null>(null);
  const [sendingOnboardingCoupon, setSendingOnboardingCoupon] = useState<string | null>(null);
  const [calculatingTrades, setCalculatingTrades] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityUser, setActivityUser] = useState<AdminUser | null>(null);

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
    if (currentUser && userId === currentUser.id) {
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

  const handleSendCoupon = async (userId: string, userName: string, userEmail: string) => {
    setSendingCoupon(userId);
    try {
      const response = await fetch('/api/admin/users/send-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Coupon email sent successfully to ${userName} (${userEmail})`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send coupon email');
      }
    } catch (error) {
      console.error('Error sending coupon email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send coupon email');
    } finally {
      setSendingCoupon(null);
    }
  };

  const handleSendWelcome = async (userId: string, userName: string, userEmail: string) => {
    setSendingWelcome(userId);
    try {
      const response = await fetch('/api/admin/users/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Welcome email sent successfully to ${userName} (${userEmail})`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send welcome email');
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send welcome email');
    } finally {
      setSendingWelcome(null);
    }
  };

  const handleSendCongrats = async (userId: string, userName: string, userEmail: string) => {
    setSendingCongrats(userId);
    try {
      const response = await fetch('/api/admin/users/send-premium-congrats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Premium congratulations email sent successfully to ${userName} (${userEmail})`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send premium congratulations email');
      }
    } catch (error) {
      console.error('Error sending premium congratulations email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send premium congratulations email');
    } finally {
      setSendingCongrats(null);
    }
  };

  const handleSendFeedback = async (userId: string, userName: string, userEmail: string) => {
    setSendingFeedback(userId);
    try {
      const response = await fetch('/api/admin/users/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Feedback request email sent successfully to ${userName} (${userEmail})`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send feedback request email');
      }
    } catch (error) {
      console.error('Error sending feedback request email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send feedback request email');
    } finally {
      setSendingFeedback(null);
    }
  };

  const handleSendOnboarding = async (userId: string, userName: string, userEmail: string) => {
    setSendingOnboarding(userId);
    try {
      const response = await fetch('/api/admin/users/send-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Onboarding check-in email sent successfully to ${userName} (${userEmail})`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send onboarding check-in email');
      }
    } catch (error) {
      console.error('Error sending onboarding check-in email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send onboarding check-in email');
    } finally {
      setSendingOnboarding(null);
    }
  };

  const handleSendOnboardingCoupon = async (userId: string, userName: string, userEmail: string) => {
    setSendingOnboardingCoupon(userId);
    try {
      const response = await fetch('/api/admin/users/send-onboarding-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Onboarding + Coupon email sent successfully to ${userName} (${userEmail})`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send onboarding + coupon email');
      }
    } catch (error) {
      console.error('Error sending onboarding + coupon email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send onboarding + coupon email');
    } finally {
      setSendingOnboardingCoupon(null);
    }
  };

  const handleCalculateTrades = async (userId: string, userName: string, userEmail: string) => {
    setCalculatingTrades(userId);
    try {
      const response = await fetch('/api/admin/trades/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      });

      if (response.ok) {
        const data = await response.json();
        const result = data.results[0];

        if (result.success) {
          toast.success(
            `Trade calculation completed for ${userName}:\n` +
            `${result.tradesCreated} trades created (${result.completedTrades} closed, ${result.openTrades} open)\n` +
            `Total P&L: $${result.totalPnL.toFixed(2)}\n` +
            `Orders processed: ${result.ordersProcessed}`
          );

          // Refresh user data to update counts
          await fetchUsers();
        } else {
          throw new Error(result.errors[0] || 'Trade calculation failed');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate trades');
      }
    } catch (error) {
      console.error('Error calculating trades:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to calculate trades');
    } finally {
      setCalculatingTrades(null);
    }
  };

  const handleDeleteUser = (user: AdminUser) => {
    if (currentUser && user.id === currentUser.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      const response = await fetch('/api/admin/users/delete-immediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userToDelete.id,
          reason: 'Immediate admin deletion via admin panel'
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Remove the user from the local state
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));

        toast.success(
          `User ${userToDelete.name || userToDelete.email} has been permanently deleted`
        );

        // Close modal and reset state
        setDeleteModalOpen(false);
        setUserToDelete(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete user'
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  const closeDeleteModal = () => {
    if (isDeletingUser) return; // Prevent closing while deletion is in progress
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleViewActivity = (user: AdminUser) => {
    setActivityUser(user);
    setActivityModalOpen(true);
  };

  const closeActivityModal = () => {
    setActivityModalOpen(false);
    setActivityUser(null);
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
                    <TableHead>Last Login</TableHead>
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
                        {user.lastLoginAt ? (
                          <div className="text-sm">
                            <div className="text-green-700 font-medium text-xs mb-1">Last Login</div>
                            <div>{format(new Date(user.lastLoginAt), 'MMM dd, yyyy')}</div>
                            <div className="text-gray-600">{format(new Date(user.lastLoginAt), 'h:mm a')}</div>
                          </div>
                        ) : user.updatedAt ? (
                          <div className="text-sm">
                            <div className="text-blue-600 font-medium text-xs mb-1">Last Active</div>
                            <div>{format(new Date(user.updatedAt), 'MMM dd, yyyy')}</div>
                            <div className="text-gray-600">{format(new Date(user.updatedAt), 'h:mm a')}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updatingUser === user.id || sendingCoupon === user.id || sendingWelcome === user.id || sendingCongrats === user.id || sendingFeedback === user.id || sendingOnboarding === user.id || sendingOnboardingCoupon === user.id || calculatingTrades === user.id || isDeletingUser}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewActivity(user)}
                            >
                              <Activity className="h-4 w-4 mr-2" />
                              View Activity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCalculateTrades(user.id, user.name || 'User', user.email)}
                              disabled={calculatingTrades === user.id}
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              {calculatingTrades === user.id ? 'Calculating...' : 'Calculate Trades'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                              disabled={currentUser ? user.id === currentUser.id : false}
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
                            <DropdownMenuItem
                              onClick={() => handleSendCoupon(user.id, user.name || 'User', user.email)}
                              disabled={sendingCoupon === user.id}
                            >
                              <Gift className="h-4 w-4 mr-2" />
                              {sendingCoupon === user.id ? 'Sending...' : 'Send Coupon'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendWelcome(user.id, user.name || 'User', user.email)}
                              disabled={sendingWelcome === user.id}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              {sendingWelcome === user.id ? 'Sending...' : 'Send Welcome Email'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendCongrats(user.id, user.name || 'User', user.email)}
                              disabled={sendingCongrats === user.id}
                            >
                              <Trophy className="h-4 w-4 mr-2" />
                              {sendingCongrats === user.id ? 'Sending...' : 'Send Premium Congrats'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendFeedback(user.id, user.name || 'User', user.email)}
                              disabled={sendingFeedback === user.id}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {sendingFeedback === user.id ? 'Sending...' : 'Send Feedback Request'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendOnboarding(user.id, user.name || 'User', user.email)}
                              disabled={sendingOnboarding === user.id}
                            >
                              <HandHelping className="h-4 w-4 mr-2" />
                              {sendingOnboarding === user.id ? 'Sending...' : 'Send Onboarding Check-In'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendOnboardingCoupon(user.id, user.name || 'User', user.email)}
                              disabled={sendingOnboardingCoupon === user.id}
                            >
                              <Gift className="h-4 w-4 mr-2" />
                              {sendingOnboardingCoupon === user.id ? 'Sending...' : 'Send Onboarding + Coupon'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user)}
                              disabled={(currentUser ? user.id === currentUser.id : false) || isDeletingUser}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
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

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteUser}
        user={userToDelete}
        isDeleting={isDeletingUser}
      />

      {/* User Activity Modal */}
      {activityUser && (
        <UserActivityModal
          isOpen={activityModalOpen}
          onClose={closeActivityModal}
          userId={activityUser.id}
          userName={activityUser.name || activityUser.email}
        />
      )}
    </div>
  );
}