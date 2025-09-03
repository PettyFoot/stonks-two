'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Using custom checkbox instead of switch
import { Label } from '@/components/ui/label';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { toast } from 'sonner';
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Lock,
  Download,
  Trash2,
  Activity
} from 'lucide-react';

// Mock security data - replace with actual data
const securitySettings = {
  twoFactorEnabled: false,
  sessionTimeout: 30,
  emailNotifications: true,
  loginAlerts: true,
  dataDownloadEnabled: true,
  accountDeletionRequested: false,
  lastPasswordChange: '2023-12-15',
  activeSessions: 2
};

const recentActivity = [
  {
    id: 1,
    action: 'Login',
    location: 'New York, NY',
    device: 'Chrome on Windows',
    timestamp: '2024-01-15 10:30 AM',
    success: true
  },
  {
    id: 2,
    action: 'Settings Changed',
    location: 'New York, NY',
    device: 'Chrome on Windows',
    timestamp: '2024-01-14 3:45 PM',
    success: true
  },
  {
    id: 3,
    action: 'Failed Login',
    location: 'Unknown',
    device: 'Unknown Browser',
    timestamp: '2024-01-12 8:22 AM',
    success: false
  }
];

interface DeletionStatus {
  isDeletionRequested: boolean;
  canReactivate: boolean;
  deletionRequestedAt?: string;
  finalDeletionAt?: string;
  daysUntilFinalDeletion: number;
  reason?: string;
}

export default function SecurityTab() {
  const { user } = useUser();
  const [settings, setSettings] = useState(securitySettings);
  const [showSessions, setShowSessions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);

  // Load deletion status function
  const loadDeletionStatus = async () => {
    if (!user?.sub) return;

    setIsLoadingStatus(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeletionStatus({
          isDeletionRequested: data.status.isDeletionRequested,
          canReactivate: data.status.canReactivate,
          deletionRequestedAt: data.status.deletionRequestedAt,
          finalDeletionAt: data.status.finalDeletionAt,
          daysUntilFinalDeletion: data.status.daysUntilFinalDeletion,
          reason: data.status.reason
        });
      }
    } catch (error) {
      console.error('Failed to load deletion status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Load deletion status on component mount and refresh periodically
  useEffect(() => {
    loadDeletionStatus();
    
    // Set up periodic refresh to catch reactivations
    const interval = setInterval(loadDeletionStatus, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [user?.sub]);

  const handleSettingChange = (key: keyof typeof securitySettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // TODO: Save to API
    console.log(`Setting ${key} changed to:`, value);
  };

  const handleChangePassword = () => {
    // Redirect to Auth0 password change
    window.location.href = '/api/auth/logout?returnTo=' + encodeURIComponent(window.location.origin + '/login?action=reset-password');
  };

  const handleEnable2FA = () => {
    // TODO: Implement 2FA setup flow
    console.log('Enable 2FA');
  };

  const handleDownloadData = async () => {
    setIsDownloadingData(true);
    try {
      const response = await fetch('/api/user/data-export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download data');
      }

      // Get the CSV content
      const csvContent = await response.text();
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'stonks_data_export.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Data export completed', {
        description: `Your trading data has been downloaded as ${filename}`
      });

    } catch (error) {
      console.error('Data download error:', error);
      toast.error('Failed to download data', {
        description: 'Please try again or contact support if the problem persists'
      });
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDeleteAccount = async (data: { reason: string; confirmation: boolean }) => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Account deletion requested successfully', {
          description: 'You have 30 days to reactivate your account by logging in.'
        });
        
        // Update deletion status
        setDeletionStatus({
          isDeletionRequested: true,
          canReactivate: true,
          deletionRequestedAt: result.deletion.requestedAt,
          finalDeletionAt: result.deletion.finalDeletionAt,
          daysUntilFinalDeletion: 90
        });

        setShowDeleteDialog(false);
        
        // Optionally redirect to logout after a delay
        setTimeout(() => {
          window.location.href = '/api/auth/logout';
        }, 3000);
      } else {
        toast.error('Failed to delete account', {
          description: result.error || 'An unexpected error occurred'
        });
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account', {
        description: 'Please try again or contact support'
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleReactivateAccount = async () => {
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Account reactivated successfully', {
          description: 'Your account deletion request has been cancelled.'
        });
        
        // Clear deletion status
        setDeletionStatus(null);
      } else {
        toast.error('Failed to reactivate account', {
          description: result.error || 'An unexpected error occurred'
        });
      }
    } catch (error) {
      console.error('Account reactivation error:', error);
      toast.error('Failed to reactivate account', {
        description: 'Please try again or contact support'
      });
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    // TODO: Implement session revocation
    console.log('Revoke session:', sessionId);
  };

  return (
    <div className="space-y-6">
      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Download Your Data</h4>
                <p className="text-sm text-muted-foreground">
                  Export all your account data and trading information
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleDownloadData}
                disabled={isDownloadingData}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloadingData ? 'Downloading...' : 'Download Data'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingStatus ? (
              <div className="flex items-center justify-center py-4">
                <p className="text-sm text-muted-foreground">Loading deletion status...</p>
              </div>
            ) : deletionStatus?.isDeletionRequested ? (
              // Account deletion requested - show status and reactivation option
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                        Account Deletion Requested
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                        Your account is scheduled for deletion. You have{' '}
                        <strong>{deletionStatus.daysUntilFinalDeletion} days</strong> to reactivate.
                      </p>
                      {deletionStatus.deletionRequestedAt && (
                        <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                          Requested: {new Date(deletionStatus.deletionRequestedAt).toLocaleDateString()}
                        </p>
                      )}
                      {deletionStatus.reason && (
                        <p className="text-xs text-red-700 dark:text-red-300">
                          Reason: {deletionStatus.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {deletionStatus.canReactivate && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Reactivate Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Cancel your deletion request and restore full access
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={handleReactivateAccount}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Reactivate Account
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-yellow-600 dark:text-yellow-400">Grace Period</div>
                    <div className="text-muted-foreground">30 days to reactivate</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-orange-600 dark:text-orange-400">Data Anonymization</div>
                    <div className="text-muted-foreground">After 30 days</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-red-600 dark:text-red-400">Final Deletion</div>
                    <div className="text-muted-foreground">After 90 days</div>
                  </div>
                </div>
              </div>
            ) : (
              // Normal state - show delete account option
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-600 dark:text-red-400">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    className="flex items-center gap-2 bg-theme-red"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
                
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Warning:</strong> This action starts a deletion process with a 30-day grace period. 
                    All your trades, reports, and account data will be permanently deleted after 90 days.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <DeleteAccountDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDeleteAccount}
        isLoading={isDeletingAccount}
        userEmail={user?.email || undefined}
      />
    </div>
  );
}