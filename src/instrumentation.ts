/**
 * Next.js Instrumentation - runs before any code
 * Used to apply console filtering for Auth0 cookie warnings
 */

export async function register() {
  if (process.env.NODE_ENV === 'development') {
    // Intercept console.error to filter out Auth0 cookies warnings
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out all cookies-related errors
      if (message.includes('cookies()') && message.includes('should be awaited')) {
        return; // Suppress all Auth0/Next.js 15 cookies errors
      }
      
      if (message.includes('sync-dynamic-apis')) {
        return; // Suppress sync dynamic APIs errors
      }

      originalError(...args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      if (message.includes('cookies()') && message.includes('should be awaited')) {
        return; // Suppress cookies warnings
      }
      
      if (message.includes('sync-dynamic-apis')) {
        return; // Suppress sync dynamic APIs warnings
      }

      originalWarn(...args);
    };
  }
}