'use client';

import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { 
  CookiePreferences, 
  CookieConsentData, 
  DEFAULT_COOKIE_PREFERENCES, 
  COOKIE_CONSENT_KEY,
  COOKIE_PREFERENCES_KEY,
  CONSENT_COOKIE_EXPIRES_DAYS,
  CURRENT_POLICY_VERSION,
  CookieCategory
} from './types';

export class CookieManager {
  private static instance: CookieManager;

  private constructor() {}

  static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  /**
   * Check if user has given cookie consent
   */
  hasConsent(): boolean {
    try {
      const consentData = this.getConsentData();
      return consentData?.hasConsented ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Get full cookie consent data
   */
  getConsentData(): CookieConsentData | null {
    try {
      const data = getCookie(COOKIE_CONSENT_KEY);
      if (!data) return null;
      
      return JSON.parse(data as string) as CookieConsentData;
    } catch {
      return null;
    }
  }

  /**
   * Get cookie preferences (with defaults if not set)
   */
  getPreferences(): CookiePreferences {
    try {
      const consentData = this.getConsentData();
      return consentData?.preferences ?? DEFAULT_COOKIE_PREFERENCES;
    } catch {
      return DEFAULT_COOKIE_PREFERENCES;
    }
  }

  /**
   * Save cookie consent and preferences
   */
  setConsent(preferences: CookiePreferences): void {
    const consentData: CookieConsentData = {
      hasConsented: true,
      consentDate: new Date().toISOString(),
      preferences,
      version: CURRENT_POLICY_VERSION,
    };

    try {
      setCookie(COOKIE_CONSENT_KEY, JSON.stringify(consentData), {
        maxAge: CONSENT_COOKIE_EXPIRES_DAYS * 24 * 60 * 60, // Convert days to seconds
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      // Also store just preferences for easier access
      setCookie(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences), {
        maxAge: CONSENT_COOKIE_EXPIRES_DAYS * 24 * 60 * 60,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      // Clean up cookies that are no longer allowed
      this.enforcePreferences(preferences);
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  }

  /**
   * Update specific category preference
   */
  updatePreference(category: CookieCategory, enabled: boolean): void {
    const currentPreferences = this.getPreferences();
    const newPreferences = {
      ...currentPreferences,
      [category]: category === 'essential' ? true : enabled, // Essential always true
    };
    this.setConsent(newPreferences);
  }

  /**
   * Accept all cookies
   */
  acceptAll(): void {
    this.setConsent({
      essential: true,
      functional: true,
      analytics: true,
    });
  }

  /**
   * Reject all non-essential cookies
   */
  rejectAll(): void {
    this.setConsent({
      essential: true,
      functional: false,
      analytics: false,
    });
  }

  /**
   * Check if a specific category is enabled
   */
  isCategoryEnabled(category: CookieCategory): boolean {
    const preferences = this.getPreferences();
    return preferences[category];
  }

  /**
   * Clear all consent data
   */
  clearConsent(): void {
    try {
      deleteCookie(COOKIE_CONSENT_KEY);
      deleteCookie(COOKIE_PREFERENCES_KEY);
      
      // Clear non-essential cookies
      this.enforcePreferences(DEFAULT_COOKIE_PREFERENCES);
    } catch (error) {
      console.error('Failed to clear cookie consent:', error);
    }
  }

  /**
   * Check if consent needs to be updated (e.g., policy version changed)
   */
  needsConsentUpdate(): boolean {
    const consentData = this.getConsentData();
    if (!consentData) return true;
    
    return consentData.version !== CURRENT_POLICY_VERSION;
  }

  /**
   * Conditionally set a cookie based on category preferences
   */
  setConditionalCookie(
    name: string,
    value: string,
    category: CookieCategory,
    options: Parameters<typeof setCookie>[2] = {}
  ): boolean {
    if (!this.hasConsent() || !this.isCategoryEnabled(category)) {
      return false;
    }

    try {
      setCookie(name, value, {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        ...options,
      });
      return true;
    } catch (error) {
      console.error(`Failed to set conditional cookie ${name}:`, error);
      return false;
    }
  }

  /**
   * Get a cookie only if the category is enabled
   */
  getConditionalCookie(name: string, category: CookieCategory): string | undefined {
    if (!this.hasConsent() || !this.isCategoryEnabled(category)) {
      return undefined;
    }

    try {
      return getCookie(name) as string | undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Remove cookies that are no longer allowed based on preferences
   */
  private enforcePreferences(preferences: CookiePreferences): void {
    try {
      // Clear functional cookies if disabled
      if (!preferences.functional) {
        deleteCookie('theme-preference');
        deleteCookie('table-settings');
        deleteCookie('dashboard-layout');
        
        // Clear localStorage items that are functional
        if (typeof window !== 'undefined') {
          localStorage.removeItem('theme');
          localStorage.removeItem('column-settings');
          localStorage.removeItem('dashboard-config');
        }
      }

      // Clear analytics cookies if disabled
      if (!preferences.analytics) {
        deleteCookie('_vercel_insights');
        deleteCookie('web-vitals');
        
        // Clear analytics from localStorage
        if (typeof window !== 'undefined') {
          // Remove any analytics-related localStorage items
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('analytics-') || key.startsWith('vercel-')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to enforce cookie preferences:', error);
    }
  }

  /**
   * Get consent status for display purposes
   */
  getConsentStatus() {
    const hasConsent = this.hasConsent();
    const preferences = this.getPreferences();
    const consentData = this.getConsentData();
    
    return {
      hasConsented: hasConsent,
      needsUpdate: this.needsConsentUpdate(),
      consentDate: consentData?.consentDate,
      preferences,
      version: consentData?.version,
    };
  }
}

// Export singleton instance
export const cookieManager = CookieManager.getInstance();