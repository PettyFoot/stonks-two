'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DemoCleanup } from '@/lib/demo/demoCleanup';

/**
 * Hook that ensures demo data is cleared when transitioning from demo to authenticated state
 * This provides an additional safety net for components that need to ensure clean data
 */
export function useCleanupDemoOnAuth() {
  const { user, isDemo, isLoading } = useAuth();
  const hasCleanedUp = useRef(false);
  const previousState = useRef({ wasDemo: false, userId: null as string | null });

  useEffect(() => {
    // Skip if auth is still loading
    if (isLoading) return;

    const currentUserId = user?.id || null;
    const currentIsDemo = isDemo;

    // Detect transition from demo to authenticated user
    if (previousState.current.wasDemo && !currentIsDemo && currentUserId && currentUserId !== 'demo-user-001' && !hasCleanedUp.current) {
      console.log('useCleanupDemoOnAuth: Detected demo to auth transition, performing cleanup');
      
      // Mark as cleaned up to prevent multiple calls
      hasCleanedUp.current = true;
      
      // Perform comprehensive cleanup
      DemoCleanup.clearAllDemoData()
        .then(() => {
          console.log('useCleanupDemoOnAuth: Cleanup completed successfully');
        })
        .catch(error => {
          console.warn('useCleanupDemoOnAuth: Error during cleanup:', error);
          // Reset flag on error so it can retry
          hasCleanedUp.current = false;
        });
    }

    // Also check for stale demo data in authenticated state
    if (!currentIsDemo && currentUserId && currentUserId !== 'demo-user-001') {
      // Check if demo data still exists in localStorage
      if (typeof window !== 'undefined') {
        const hasDemoMode = localStorage.getItem('demo-mode') === 'true';
        const hasOtherDemoData = DemoCleanup.hasDemoData();
        
        if ((hasDemoMode || hasOtherDemoData) && !hasCleanedUp.current) {
          console.warn('useCleanupDemoOnAuth: Detected stale demo data for authenticated user, cleaning up');
          hasCleanedUp.current = true;
          
          DemoCleanup.clearAllDemoData()
            .then(() => {
              console.log('useCleanupDemoOnAuth: Stale demo data cleanup completed');
            })
            .catch(error => {
              console.warn('useCleanupDemoOnAuth: Error cleaning stale demo data:', error);
              hasCleanedUp.current = false;
            });
        }
      }
    }

    // Reset cleanup flag when user changes (e.g., logout/login)
    if (previousState.current.userId !== currentUserId) {
      hasCleanedUp.current = false;
    }

    // Update previous state for next comparison
    previousState.current = {
      wasDemo: currentIsDemo,
      userId: typeof currentUserId === 'string' ? currentUserId : null
    };

  }, [user?.id, isDemo, isLoading]);

  return {
    isCleaningUp: hasCleanedUp.current,
    forceCleanup: async () => {
      console.log('useCleanupDemoOnAuth: Force cleanup requested');
      hasCleanedUp.current = true;
      try {
        await DemoCleanup.clearAllDemoData();
        console.log('useCleanupDemoOnAuth: Force cleanup completed');
      } catch (error) {
        console.warn('useCleanupDemoOnAuth: Error during force cleanup:', error);
        hasCleanedUp.current = false;
        throw error;
      }
    }
  };
}