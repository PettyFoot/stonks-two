'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, useRef } from 'react';

const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const SYNC_STORAGE_KEY = 'user_last_sync';

export function useUserSync() {
  const { user, isLoading } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    async function syncUser() {
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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to sync user');
        }

        const result = await response.json();
        console.log('User synced successfully:', result.user);
        
        // Store sync time in sessionStorage
        sessionStorage.setItem(SYNC_STORAGE_KEY, Date.now().toString());
      } catch (error) {
        console.error('Failed to sync user:', error);
        setSyncError(error instanceof Error ? error.message : 'Unknown error');
        // Reset the flag on error so it can retry later
        hasSyncedRef.current = false;
      } finally {
        setIsSyncing(false);
      }
    }

    // Only sync once when user becomes available
    if (user && !isLoading) {
      syncUser();
    }
  }, [user, isLoading]); // Removed isSyncing from dependencies to prevent loop

  return { isSyncing, syncError };
}