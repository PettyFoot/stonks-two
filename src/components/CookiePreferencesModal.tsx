'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cookieManager } from '@/lib/cookies/manager';
import { CookiePreferences, COOKIE_DEFINITIONS } from '@/lib/cookies/types';
import { Shield, Settings, BarChart3, Info } from 'lucide-react';
import Link from 'next/link';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const categoryIcons = {
  essential: Shield,
  functional: Settings,
  analytics: BarChart3,
};

const categoryDescriptions = {
  essential: "Required for the website to function properly. These cannot be disabled.",
  functional: "Help us remember your preferences and provide enhanced features.",
  analytics: "Help us understand how you use our website to improve your experience.",
};

export function CookiePreferencesModal({ isOpen, onClose, onSave }: CookiePreferencesModalProps) {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: false,
    analytics: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load current preferences when modal opens
      const currentPreferences = cookieManager.getPreferences();
      setPreferences(currentPreferences);
    }
  }, [isOpen]);

  const handleToggle = (category: keyof CookiePreferences, enabled: boolean) => {
    if (category === 'essential') return; // Cannot disable essential cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: enabled
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      cookieManager.setConsent(preferences);
      onSave();
    } catch (error) {
      console.error('Failed to save cookie preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptAll = () => {
    setPreferences({
      essential: true,
      functional: true,
      analytics: true,
    });
  };

  const handleRejectAll = () => {
    setPreferences({
      essential: true,
      functional: false,
      analytics: false,
    });
  };

  const getCookiesForCategory = (category: keyof CookiePreferences) => {
    return COOKIE_DEFINITIONS.filter(cookie => cookie.category === category);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Cookie Preferences</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Choose which cookies you're comfortable with us using. You can change these settings at any time.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-3 pb-4 border-b">
            <Button 
              variant="outline" 
              onClick={handleRejectAll}
              className="text-sm"
            >
              Reject All
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAcceptAll}
              className="text-sm"
            >
              Accept All
            </Button>
          </div>

          {/* Cookie Categories */}
          {Object.entries(categoryDescriptions).map(([category, description]) => {
            const categoryKey = category as keyof CookiePreferences;
            const Icon = categoryIcons[categoryKey];
            const isEnabled = preferences[categoryKey];
            const isEssential = categoryKey === 'essential';
            const cookiesInCategory = getCookiesForCategory(categoryKey);

            return (
              <Card key={category} className={isEnabled ? "border-blue-200 bg-blue-50/50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {category} Cookies
                          {isEssential && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              Always Active
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {description}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(enabled) => handleToggle(categoryKey, enabled)}
                      disabled={isEssential}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {cookiesInCategory.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Cookies in this category:
                      </p>
                      <div className="grid gap-3">
                        {cookiesInCategory.map((cookie) => (
                          <div key={cookie.name} className="bg-white rounded-lg p-3 border border-gray-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{cookie.name}</p>
                                <p className="text-xs text-gray-600 mt-1">{cookie.purpose}</p>
                              </div>
                              <div className="ml-4 text-right text-xs text-gray-500">
                                <p>Duration: {cookie.duration}</p>
                                <p>Provider: {cookie.provider}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Additional Information */}
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-2">Need more information?</p>
                  <p className="text-blue-800 mb-3">
                    Learn more about our cookie practices and your privacy rights in our detailed policies.
                  </p>
                  <div className="flex gap-4">
                    <Link 
                      href="/cookies" 
                      className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      target="_blank"
                    >
                      Cookie Policy
                    </Link>
                    <Link 
                      href="/privacy" 
                      className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}