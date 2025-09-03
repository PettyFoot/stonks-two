'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const SYNC_STORAGE_KEY = 'user_last_sync';

export function useUserSync() {
  const { user, isLoading } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [wasReactivated, setWasReactivated] = useState(false);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    async function syncUser(retryCount = 0) {
      const maxRetries = 3;
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      
      // Check if we should skip sync
      if (!user || isLoading || hasSyncedRef.current) return;

      // Check last sync time from sessionStorage
      const lastSyncTime = sessionStorage.getItem(SYNC_STORAGE_KEY);
      if (lastSyncTime) {
        const timeSinceLastSync = Date.now() - parseInt(lastSyncTime, 10);
        if (timeSinceLastSync < SYNC_INTERVAL) {
          console.log('Skipping user sync - last synced', Math.round(timeSinceLastSync / 1000), 'seconds ago');
          hasSyncedRef.current = true;
          return;
        }
      }

      try {
        setIsSyncing(true);
        setSyncError(null);
        hasSyncedRef.current = true;

        const response = await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If it's a 401 error and we haven't exceeded max retries, retry after delay
          if (response.status === 401 && retryCount < maxRetries) {
            console.log(`User sync authentication failed, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
            hasSyncedRef.current = false; // Reset flag to allow retry
            setTimeout(() => {
              syncUser(retryCount + 1);
            }, retryDelay);
            return;
          }
          
          const errorData = await response.json().catch(() => ({ error: 'Failed to sync user' }));
          throw new Error(errorData.error || 'Failed to sync user');
        }

        const result = await response.json();
        console.log('User synced successfully:', result.user);
        
        // Handle reactivation
        if (result.wasReactivated) {
          console.log('Account was reactivated during sync');
          setWasReactivated(true);
          
          // Check if we've already shown the reactivation message
          const hasShownReactivation = sessionStorage.getItem('reactivation_toast_shown');
          if (!hasShownReactivation) {
            // Show toast notification
            toast.success('Welcome back!', {
              description: 'Your account was automatically reactivated when you logged in.',
            });
            
            // Mark that we've shown the reactivation toast
            sessionStorage.setItem('reactivation_toast_shown', 'true');
          }
        }
        
        // Store sync time in sessionStorage
        sessionStorage.setItem(SYNC_STORAGE_KEY, Date.now().toString());
      } catch (error) {
        // If it's a network error and we haven't exceeded max retries, retry after delay
        if (retryCount < maxRetries && (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch')))) {
          console.log(`User sync network error, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
          hasSyncedRef.current = false; // Reset flag to allow retry
          setTimeout(() => {
            syncUser(retryCount + 1);
          }, retryDelay);
          return;
        }
        
        console.error('Failed to sync user:', error);
        setSyncError(error instanceof Error ? error.message : 'Unknown error');
        // Reset the flag on error so it can retry later
        hasSyncedRef.current = false;
      } finally {
        // Only set syncing to false if we're not retrying
        if (retryCount >= maxRetries || hasSyncedRef.current) {
          setIsSyncing(false);
        }
      }
    }

    // Only sync once when user becomes available
    if (user && !isLoading) {
      syncUser();
    }
  }, [user, isLoading]); // Removed isSyncing from dependencies to prevent loop

  return { isSyncing, syncError, wasReactivated };
}