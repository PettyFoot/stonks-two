/**
 * Console filter to suppress Auth0/Next.js 15 cookies warnings in development
 * This is a temporary workaround until Auth0 SDK v4 migration
 */

if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Server-side console filtering
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter out the specific cookies warnings (comprehensive patterns)
    if (
      message.includes('cookies()') &&
      message.includes('should be awaited before using its value')
    ) {
      return; // Suppress all cookies-related await errors
    }
    
    // Filter out sync-dynamic-apis related errors
    if (message.includes('sync-dynamic-apis')) {
      return; // Suppress this error category
    }

    // Filter out specific Next.js route warnings
    if (message.includes('Route "') && message.includes('used `cookies()')) {
      return; // Suppress route-specific cookies errors
    }

    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter out related warnings
    if (message.includes('sync-dynamic-apis')) {
      return; // Suppress this warning
    }

    // Filter out cookies warnings
    if (message.includes('cookies()') && message.includes('should be awaited')) {
      return; // Suppress cookies warnings
    }

    originalWarn(...args);
  };
}