'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
  Shield,
  Calendar
} from 'lucide-react';

interface DeletionStatus {
  isDeletionRequested: boolean;
  isDeleted: boolean;
  canReactivate: boolean;
  deletionRequestedAt?: string;
  finalDeletionAt?: string;
  daysUntilFinalDeletion: number;
  reason?: string;
  isAnonymized: boolean;
}

export default function AccountReactivatePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const loadDeletionStatus = async () => {
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
          isDeleted: data.status.isDeleted,
          canReactivate: data.status.canReactivate,
          deletionRequestedAt: data.status.deletionRequestedAt,
          finalDeletionAt: data.status.finalDeletionAt,
          daysUntilFinalDeletion: data.status.daysUntilFinalDeletion,
          reason: data.status.reason,
          isAnonymized: data.status.anonymizedAt != null
        });
      } else {
        console.error('Failed to load deletion status');
        // If account is not found or error, might have been auto-reactivated
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to load deletion status:', error);
      // On error, redirect to dashboard as account might be fine
      router.push('/dashboard');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      // User is not logged in, redirect to login
      router.push('/api/auth/login?returnTo=' + encodeURIComponent(window.location.href));
      return;
    }

    if (user) {
      loadDeletionStatus();
    }
  }, [user, isLoading, router]);

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Account reactivated successfully!', {
          description: 'Welcome back! Your account has been restored.'
        });
        
        // Redirect to dashboard after successful reactivation
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
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
    } finally {
      setIsReactivating(false);
    }
  };

  if (isLoading || isLoadingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Checking account status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!deletionStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Account is Active</h2>
              <p className="text-muted-foreground mb-4">
                Your account is not scheduled for deletion.
              </p>
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { isDeletionRequested, canReactivate, daysUntilFinalDeletion, isAnonymized } = deletionStatus;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Account Reactivation</h1>
          <p className="text-muted-foreground">
            Restore access to your Trade Voyager account
          </p>
        </div>

        {/* Account Status Card */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Account Deletion Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <Badge variant={isDeletionRequested ? "destructive" : "secondary"}>
                  {isDeletionRequested ? "Deletion Requested" : "Active"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Reactivation:</span>
                <Badge variant={canReactivate ? "default" : "destructive"}>
                  {canReactivate ? "Available" : "Not Available"}
                </Badge>
              </div>

              {deletionStatus.deletionRequestedAt && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Requested:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(deletionStatus.deletionRequestedAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-medium">Days remaining:</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold text-orange-600">
                    {daysUntilFinalDeletion} days
                  </span>
                </div>
              </div>

              {deletionStatus.reason && (
                <div className="pt-3 border-t">
                  <span className="font-medium text-sm">Reason:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {deletionStatus.reason}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reactivation Options */}
        {canReactivate && !isAnonymized ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Shield className="h-5 w-5" />
                Reactivate Your Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You can restore full access to your account by clicking the button below.
                  This will immediately cancel the deletion request and restore all your data.
                </p>

                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    What happens when you reactivate:
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Deletion request is immediately cancelled</li>
                    <li>• Full account access is restored</li>
                    <li>• All your trading data remains intact</li>
                    <li>• Subscriptions can be resumed if needed</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleReactivate}
                  disabled={isReactivating}
                  className="w-full"
                  size="lg"
                >
                  {isReactivating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Reactivate My Account
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Reactivation Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isAnonymized ? (
                  <>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Your account data has been anonymized and cannot be recovered. 
                      The grace period for reactivation has expired.
                    </p>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Data Status:</strong> Personal information has been permanently anonymized for privacy compliance.
                      </p>
                    </div>
                  </>
                ) : daysUntilFinalDeletion <= 0 ? (
                  <>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      The grace period for account reactivation has expired. 
                      Your account and data have been permanently deleted.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Your account cannot be reactivated at this time. Please contact support for assistance.
                    </p>
                  </>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/contact'}
                  className="w-full"
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Deletion Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isDeletionRequested ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                <div className="flex-1">
                  <p className="font-medium">Deletion Requested</p>
                  <p className="text-sm text-muted-foreground">Account access blocked, 30-day grace period begins</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isAnonymized ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                <div className="flex-1">
                  <p className="font-medium">Data Anonymization (30 days)</p>
                  <p className="text-sm text-muted-foreground">Personal data anonymized, reactivation no longer possible</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${daysUntilFinalDeletion <= 0 ? 'bg-red-600' : 'bg-gray-300'}`}></div>
                <div className="flex-1">
                  <p className="font-medium">Final Deletion (90 days)</p>
                  <p className="text-sm text-muted-foreground">Complete permanent deletion of all data</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}