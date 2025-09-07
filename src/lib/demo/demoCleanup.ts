'use client';

import { MarketDataCache } from '@/lib/marketData/cache';

/**
 * Comprehensive demo data cleanup utility
 * Clears all demo-related data from browser storage and caches
 */
export class DemoCleanup {
  /**
   * Clear all demo data from the browser
   */
  static async clearAllDemoData(): Promise<void> {
    if (typeof window === 'undefined') return;

    console.log('Starting comprehensive demo data cleanup...');

    try {
      // Clear demo-specific localStorage items
      this.clearDemoLocalStorage();
      
      // Clear demo-specific sessionStorage items
      this.clearDemoSessionStorage();
      
      // Clear market data cache
      this.clearMarketDataCache();
      
      // Clear demo cookies (client-side)
      this.clearDemoCookies();
      
      // Clear any cached API responses
      await this.clearBrowserCaches();
      
      // Clear query cache if using React Query/TanStack Query
      this.clearQueryCache();
      
      console.log('Demo data cleanup completed successfully');
    } catch (error) {
      console.warn('Error during demo data cleanup:', error);
    }
  }

  /**
   * Clear localStorage items
   */
  private static clearDemoLocalStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      const keysToRemove = keys.filter(key => 
        // Clear demo-specific items
        key.includes('demo') || 
        key.includes('Demo') || 
        key.includes('DEMO') ||
        key.includes('stonks_demo') ||
        // Clear market data cache
        key.startsWith('stonks_market_data_') ||
        // Clear any potential cached trade data
        key.includes('trades') ||
        key.includes('portfolio') ||
        key.includes('analytics') ||
        // Clear any user preference items that might be demo-related
        key.includes('user_') ||
        key.includes('filter') ||
        key.includes('settings')
      );
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage key: ${key}`);
      });
      
      console.log(`Cleared ${keysToRemove.length} localStorage items`);
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
    }
  }

  /**
   * Clear sessionStorage items
   */
  private static clearDemoSessionStorage(): void {
    try {
      const keys = Object.keys(sessionStorage);
      const keysToRemove = keys.filter(key => 
        key.includes('demo') || 
        key.includes('Demo') || 
        key.includes('DEMO') ||
        key.includes('trades') ||
        key.includes('user_') ||
        key.includes('auth_') ||
        key.includes('session_')
      );
      
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`Cleared sessionStorage key: ${key}`);
      });
      
      console.log(`Cleared ${keysToRemove.length} sessionStorage items`);
    } catch (error) {
      console.warn('Error clearing sessionStorage:', error);
    }
  }

  /**
   * Clear market data cache
   */
  private static clearMarketDataCache(): void {
    try {
      MarketDataCache.clear();
      console.log('Market data cache cleared');
    } catch (error) {
      console.warn('Error clearing market data cache:', error);
    }
  }

  /**
   * Clear demo-related cookies (client-side)
   */
  private static clearDemoCookies(): void {
    try {
      const cookies = document.cookie.split(';');
      
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (name.includes('demo') || name.includes('Demo') || name.includes('DEMO')) {
          // Clear cookie by setting it to expire
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
          console.log(`Cleared cookie: ${name}`);
        }
      });
    } catch (error) {
      console.warn('Error clearing cookies:', error);
    }
  }

  /**
   * Clear browser caches
   */
  private static async clearBrowserCaches(): Promise<void> {
    try {
      // Clear Service Worker caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Browser caches cleared');
      }
    } catch (error) {
      console.warn('Error clearing browser caches:', error);
    }
  }

  /**
   * Clear React Query/TanStack Query cache if present
   */
  private static clearQueryCache(): void {
    try {
      // Check if there's a global query client
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        (window as any).queryClient.clear();
        console.log('Query cache cleared');
      }
    } catch (error) {
      console.warn('Error clearing query cache:', error);
    }
  }

  /**
   * Force a hard refresh of the page after cleanup
   */
  static async clearAndRefresh(): Promise<void> {
    await this.clearAllDemoData();
    
    // Add a small delay to ensure cleanup completes
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  /**
   * Clear demo data and redirect to a specific URL
   */
  static async clearAndRedirect(url: string): Promise<void> {
    await this.clearAllDemoData();
    
    // Add a small delay to ensure cleanup completes
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  }

  /**
   * Clear demo data when server-side demo session logout is called
   */
  static async clearOnDemoLogout(): Promise<void> {
    try {
      // Call server-side demo logout
      const response = await fetch('/api/demo/logout', { 
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        console.log('Server-side demo session cleared');
      }
    } catch (error) {
      console.warn('Error clearing server-side demo session:', error);
    }
    
    // Always clear client-side data regardless of server response
    await this.clearAllDemoData();
  }

  /**
   * Check if demo data exists in browser storage
   */
  static hasDemoData(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const localStorageKeys = Object.keys(localStorage);
      const sessionStorageKeys = Object.keys(sessionStorage);
      
      const hasDemoLocalStorage = localStorageKeys.some(key => 
        key.includes('demo') || key.includes('Demo') || key.includes('DEMO')
      );
      
      const hasDemoSessionStorage = sessionStorageKeys.some(key => 
        key.includes('demo') || key.includes('Demo') || key.includes('DEMO')
      );
      
      const hasDemoCookies = document.cookie.includes('demo');
      
      return hasDemoLocalStorage || hasDemoSessionStorage || hasDemoCookies;
    } catch (error) {
      console.warn('Error checking for demo data:', error);
      return false;
    }
  }
}

/**
 * Legacy function for backward compatibility
 */
export const clearDemoData = () => DemoCleanup.clearAllDemoData();