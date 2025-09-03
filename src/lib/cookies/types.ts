export interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  functional: boolean; // Theme, settings, preferences
  analytics: boolean; // Vercel Analytics, performance monitoring
}

export interface CookieConsentData {
  hasConsented: boolean;
  consentDate: string;
  preferences: CookiePreferences;
  version: string; // Policy version when consent was given
}

export type CookieCategory = keyof CookiePreferences;

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
};

export const COOKIE_CONSENT_KEY = 'cookie-consent';
export const COOKIE_PREFERENCES_KEY = 'cookie-preferences';
export const CONSENT_COOKIE_EXPIRES_DAYS = 365;
export const CURRENT_POLICY_VERSION = '1.0.0';

export interface CookieInfo {
  name: string;
  category: CookieCategory;
  purpose: string;
  duration: string;
  provider: string;
}

export const COOKIE_DEFINITIONS: CookieInfo[] = [
  // Essential Cookies
  {
    name: 'appSession',
    category: 'essential',
    purpose: 'Maintains your login session securely',
    duration: 'Session',
    provider: 'Auth0'
  },
  {
    name: 'cookie-consent',
    category: 'essential',
    purpose: 'Remembers your cookie consent preferences',
    duration: '1 year',
    provider: 'Trade Voyager Analytics'
  },
  {
    name: 'XSRF-TOKEN',
    category: 'essential',
    purpose: 'Protects against cross-site request forgery attacks',
    duration: 'Session',
    provider: 'Trade Voyager Analytics'
  },

  // Functional Cookies
  {
    name: 'theme-preference',
    category: 'functional',
    purpose: 'Remembers your chosen theme (light/dark mode)',
    duration: '1 year',
    provider: 'Trade Voyager Analytics'
  },
  {
    name: 'table-settings',
    category: 'functional',
    purpose: 'Remembers your table column and sorting preferences',
    duration: '1 year',
    provider: 'Trade Voyager Analytics'
  },
  {
    name: 'dashboard-layout',
    category: 'functional',
    purpose: 'Remembers your dashboard customization settings',
    duration: '1 year',
    provider: 'Trade Voyager Analytics'
  },

  // Analytics Cookies
  {
    name: '_vercel_insights',
    category: 'analytics',
    purpose: 'Collects anonymous usage statistics to improve our platform',
    duration: '2 years',
    provider: 'Vercel'
  },
  {
    name: 'web-vitals',
    category: 'analytics',
    purpose: 'Measures website performance and loading times',
    duration: 'Session',
    provider: 'Trade Voyager Analytics'
  }
];