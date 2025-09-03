'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function WelcomeBackBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState<'welcome_back' | 'reactivated' | 'auto_reactivated' | null>(null);

  useEffect(() => {
    const welcomeBack = searchParams.get('welcome_back');
    const reactivated = searchParams.get('reactivated');
    
    if (welcomeBack === 'true') {
      setBannerType('welcome_back');
      setShowBanner(true);
      
      // Show toast notification
      toast.success('Welcome back!', {
        description: 'Your account has been successfully reactivated.'
      });
      
      // Clean up URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('welcome_back');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      
    } else if (reactivated === 'true') {
      setBannerType('reactivated');
      setShowBanner(true);
      
      // Show toast notification
      toast.success('Account reactivated!', {
        description: 'Your account deletion request has been cancelled.'
      });
      
      // Clean up URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('reactivated');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, router]);

  // Check for automatic reactivation on login
  useEffect(() => {
    const checkAutoReactivation = async () => {
      if (!user?.sub || showBanner) return;

      // Check if we've already shown the reactivation banner
      const hasShownReactivation = sessionStorage.getItem('reactivation_banner_shown');
      if (hasShownReactivation) return;

      try {
        const response = await fetch('/api/account/delete');
        if (response.ok) {
          const data = await response.json();
          
          // Check if user was recently auto-reactivated (within last 5 minutes)
          const recentLogs = data.logs?.filter((log: any) => 
            log.action === 'REACTIVATED' && 
            new Date(log.createdAt).getTime() > Date.now() - (5 * 60 * 1000)
          ) || [];

          if (recentLogs.length > 0 && !data.status.isDeletionRequested) {
            setBannerType('auto_reactivated');
            setShowBanner(true);
            
            // Mark that we've shown the reactivation banner
            sessionStorage.setItem('reactivation_banner_shown', 'true');
            
            toast.success('Welcome back!', {
              description: 'Your account has been automatically reactivated.'
            });
          }
        }
      } catch (error) {
        console.error('Failed to check auto-reactivation:', error);
      }
    };

    // Delay check to allow for auth to complete
    const timer = setTimeout(checkAutoReactivation, 1000);
    return () => clearTimeout(timer);
  }, [user?.sub, showBanner]);

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner || !bannerType) {
    return null;
  }

  return (
    <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              {bannerType === 'welcome_back' ? (
                <>
                  <strong className="text-green-800 dark:text-green-200 block">Welcome back!</strong>
                  <span className="text-green-700 dark:text-green-300 text-sm">
                    Your account has been automatically reactivated. All your data is intact and ready to use.
                  </span>
                </>
              ) : bannerType === 'auto_reactivated' ? (
                <>
                  <strong className="text-green-800 dark:text-green-200 block">Welcome back!</strong>
                  <span className="text-green-700 dark:text-green-300 text-sm">
                    Your account was automatically reactivated when you logged in. Your deletion request has been cancelled.
                  </span>
                </>
              ) : (
                <>
                  <strong className="text-green-800 dark:text-green-200 block">Account Reactivated!</strong>
                  <span className="text-green-700 dark:text-green-300 text-sm">
                    Your account deletion request has been cancelled. Welcome back to Trade Voyager!
                  </span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="ml-4 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}