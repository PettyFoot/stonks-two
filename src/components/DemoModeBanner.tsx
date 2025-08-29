'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Info, Sparkles, Clock, X } from 'lucide-react';

export function DemoModeBanner() {
  const { isDemo, user, upgradeUrl, extendSession } = useAuth();
  const pathname = usePathname();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!isDemo || !user?.expiresAt) return;

    const updateTimer = () => {
      const remaining = new Date(user.expiresAt as string).getTime() - Date.now();
      if (remaining <= 0) {
        // Clear demo session and redirect to login
        fetch('/api/demo/logout', { method: 'POST' })
          .then(() => {
            window.location.href = '/login?expired=true';
          })
          .catch(() => {
            window.location.href = '/login?expired=true';
          });
        return;
      }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      // Set expiring soon warning when less than 2 minutes remaining
      setIsExpiringSoon(remaining <= 2 * 60 * 1000);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isDemo, user]);

  const handleExtendSession = async () => {
    try {
      await extendSession();
      // Show success message or update UI
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  // Don't show banner on public pages
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/api/');
  
  if (!isDemo || isPublicPage) return null;

  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          size="sm"
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg"
          onClick={() => setIsMinimized(false)}
        >
          <Info className="h-4 w-4 mr-2" />
          Demo Mode
        </Button>
      </div>
    );
  }

  return (
    <div className={`text-white shadow-lg transition-colors ${
      isExpiringSoon 
        ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-600 animate-pulse' 
        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 animate-pulse" />
              <span className="font-semibold">Demo Mode</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="opacity-90">
                {isExpiringSoon ? '⚠️ Demo expiring soon!' : 'Exploring with sample data'}
              </span>
              {timeRemaining && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{timeRemaining}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              size="sm" 
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={handleExtendSession}
            >
              <Clock className="h-4 w-4 mr-2" />
              Extend
            </Button>
            <Button 
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100 font-semibold"
              onClick={() => window.location.href = upgradeUrl}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Unlock Full Access
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => setIsMinimized(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}