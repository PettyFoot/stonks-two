'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cookieManager } from '@/lib/cookies/manager';
import { CookiePreferences, COOKIE_DEFINITIONS, CookieCategory } from '@/lib/cookies/types';
import { CookiePreferencesModal } from '@/components/CookiePreferencesModal';
import { Shield, Settings, BarChart3, ExternalLink, RefreshCw, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

const categoryIcons = {
  essential: Shield,
  functional: Settings,
  analytics: BarChart3,
};

const categoryDescriptions = {
  essential: "These cookies are necessary for the website to function and cannot be disabled.",
  functional: "These cookies enhance your experience by remembering your preferences.",
  analytics: "These cookies help us understand how you use our website to improve it.",
};

const categoryColors = {
  essential: "bg-red-50 border-red-200 text-red-700",
  functional: "bg-blue-50 border-blue-200 text-blue-700", 
  analytics: "bg-green-50 border-green-200 text-green-700",
};

export default function CookieSettingsTab() {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: false,
    analytics: false,
  });
  const [consentStatus, setConsentStatus] = useState<any>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load current preferences and consent status
    const currentPreferences = cookieManager.getPreferences();
    const status = cookieManager.getConsentStatus();
    setPreferences(currentPreferences);
    setConsentStatus(status);
  }, []);

  const handleToggle = async (category: CookieCategory, enabled: boolean) => {
    if (category === 'essential') return; // Cannot disable essential cookies
    
    setIsLoading(true);
    try {
      cookieManager.updatePreference(category, enabled);
      setPreferences(prev => ({ ...prev, [category]: enabled }));
      
      // Update consent status
      const newStatus = cookieManager.getConsentStatus();
      setConsentStatus(newStatus);
      
      // Reload page to apply changes if needed
      if (category === 'analytics') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to update cookie preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    setIsLoading(true);
    try {
      cookieManager.clearConsent();
      setPreferences({ essential: true, functional: false, analytics: false });
      setConsentStatus(null);
      
      // Reload page to reset everything
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear cookies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCookiesForCategory = (category: CookieCategory) => {
    return COOKIE_DEFINITIONS.filter(cookie => cookie.category === category);
  };

  const getEnabledCount = () => {
    return Object.values(preferences).filter(Boolean).length;
  };

  const getTotalCount = () => {
    return Object.keys(preferences).length;
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Cookie & Privacy Settings
          </CardTitle>
          <CardDescription>
            Control how we use cookies and similar technologies to enhance your experience.
            Your privacy matters to us, and you have full control over these preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {getEnabledCount()}/{getTotalCount()}
              </div>
              <div className="text-sm text-blue-700">Categories Enabled</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {consentStatus?.hasConsented ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-green-700">Consent Given</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {consentStatus?.consentDate ? new Date(consentStatus.consentDate).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm text-purple-700">Last Updated</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                v{consentStatus?.version || '1.0.0'}
              </div>
              <div className="text-sm text-orange-700">Policy Version</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => setShowPreferencesModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage All Preferences
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearAll}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cookie Categories */}
      {Object.entries(categoryDescriptions).map(([category, description]) => {
        const categoryKey = category as CookieCategory;
        const Icon = categoryIcons[categoryKey];
        const isEnabled = preferences[categoryKey];
        const isEssential = categoryKey === 'essential';
        const cookiesInCategory = getCookiesForCategory(categoryKey);
        const colorClass = categoryColors[categoryKey];

        return (
          <Card key={category} className={isEnabled ? "border-l-4 border-l-blue-500" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-600" />
                  <div>
                    <CardTitle className="text-lg capitalize">
                      {category} Cookies
                      {isEssential && (
                        <Badge variant="secondary" className="ml-2">
                          Always Active
                        </Badge>
                      )}
                      {isEnabled && !isEssential && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                          Enabled
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {description}
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(enabled) => handleToggle(categoryKey, enabled)}
                  disabled={isEssential || isLoading}
                />
              </div>
            </CardHeader>
            
            {cookiesInCategory.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Cookies in this category ({cookiesInCategory.length})
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {cookiesInCategory.map((cookie) => (
                      <div key={cookie.name} className={`rounded-lg p-3 border ${colorClass}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{cookie.name}</p>
                            <p className="text-xs mt-1 opacity-80">{cookie.purpose}</p>
                          </div>
                          <div className="ml-4 text-right text-xs opacity-70">
                            <p>Duration: {cookie.duration}</p>
                            <p>Provider: {cookie.provider}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Policy Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-gray-600" />
            Learn More
          </CardTitle>
          <CardDescription>
            Read our detailed policies to understand how we protect your privacy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" asChild>
              <Link href="/cookies" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Cookie Policy
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/privacy" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Privacy Policy
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onSave={() => {
          setShowPreferencesModal(false);
          // Refresh the page to apply new settings
          window.location.reload();
        }}
      />
    </div>
  );
}