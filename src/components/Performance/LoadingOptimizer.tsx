'use client';

import { Suspense, lazy } from 'react';
import dynamic from 'next/dynamic';

// Loading fallback component
export function LoadingFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-300 rounded h-4 w-full mb-2"></div>
      <div className="bg-gray-300 rounded h-4 w-3/4 mb-2"></div>
      <div className="bg-gray-300 rounded h-4 w-1/2"></div>
    </div>
  );
}

// Generic optimized component loaders - examples for when you have actual components
// export const OptimizedChart = dynamic(() => import('@/components/ui/chart'), {
//   loading: () => <LoadingFallback className="h-64" />,
//   ssr: false
// });

// export const OptimizedDataTable = dynamic(() => import('@/components/ui/data-table'), {
//   loading: () => <LoadingFallback className="h-48" />,
//   ssr: false
// });

// Generic optimized component loader
export function withOptimizedLoading<T extends object>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallbackHeight = 'h-32'
) {
  return dynamic(importFn, {
    loading: () => <LoadingFallback className={fallbackHeight} />,
    ssr: false
  });
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log Core Web Vitals metrics
        if (entry.entryType === 'largest-contentful-paint') {

        }
        if (entry.entryType === 'first-input') {
          // Type assertion for first input entry
          const fidEntry = entry as PerformanceEventTiming;

        }
        if (entry.entryType === 'layout-shift') {
          // Type assertion for layout shift entry
          const clsEntry = entry as any;
          if (!clsEntry.hadRecentInput) {

          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    
    return () => observer.disconnect();
  }
  
  return () => {};
}