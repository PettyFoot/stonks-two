'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';

export function useUserSync() {
  const { user, isLoading } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (!user || isLoading || isSyncing) return;

      try {
        setIsSyncing(true);
        setSyncError(null);

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
      } catch (error) {
        console.error('Failed to sync user:', error);
        setSyncError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsSyncing(false);
      }
    }

    // Only sync once when user becomes available
    if (user && !isLoading && !isSyncing) {
      syncUser();
    }
  }, [user, isLoading]); // Removed isSyncing from dependencies to prevent infinite loop

  return { isSyncing, syncError };
}