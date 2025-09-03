'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cookieManager } from '@/lib/cookies/manager';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import Link from 'next/link';
import { X } from 'lucide-react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only show banner if user hasn't consented or needs consent update
    const shouldShow = !cookieManager.hasConsent() || cookieManager.needsConsentUpdate();
    setShowBanner(shouldShow);
  }, []);

  const handleAcceptAll = async () => {
    setIsLoading(true);
    try {
      cookieManager.acceptAll();
      setShowBanner(false);
      
      // Reload page to enable analytics if they were previously disabled
      if (cookieManager.needsConsentUpdate()) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to accept cookies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAll = async () => {
    setIsLoading(true);
    try {
      cookieManager.rejectAll();
      setShowBanner(false);
    } catch (error) {
      console.error('Failed to reject cookies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSaved = () => {
    setShowPreferences(false);
    setShowBanner(false);
    
    // Reload page to apply new preferences
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner - Fixed position at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/20 backdrop-blur-sm">
        <Card className="max-w-4xl mx-auto bg-white shadow-xl border-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  We use cookies to enhance your experience
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Trade Voyager Analytics uses cookies to keep you logged in, remember your preferences, 
                  and analyze website performance. We respect your privacy and give you full control 
                  over which cookies we can use.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="flex-shrink-0 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <Link 
                  href="/cookies" 
                  className="hover:text-blue-600 underline underline-offset-2"
                >
                  Cookie Policy
                </Link>
                <span>•</span>
                <Link 
                  href="/privacy" 
                  className="hover:text-blue-600 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  disabled={isLoading}
                  className="text-sm"
                >
                  Reject All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPreferences(true)}
                  disabled={isLoading}
                  className="text-sm"
                >
                  Manage Preferences
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  disabled={isLoading}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handlePreferencesSaved}
      />
    </>
  );
}